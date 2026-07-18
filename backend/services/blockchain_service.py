"""
Blockchain Explorer Service (Etherscan / BscScan API Integration with Caching)
"""
import os
import re
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import httpx
from backend.models.database import MongoDBManager


class BlockchainExplorerService:
    """Service to fetch verified smart contract source codes and ABIs from explorers"""

    def __init__(self):
        self.etherscan_key = os.getenv("ETHERSCAN_API_KEY", "")

    def _get_api_url_key_and_chainid(self, chain: str) -> Tuple[str, str, int]:
        chain_lower = chain.lower()
        api_url = "https://api.etherscan.io/v2/api"
        
        if chain_lower in ["bsc", "binance", "bnb"]:
            return api_url, self.etherscan_key, 56
        # Default to Ethereum (Mainnet chainid=1)
        return api_url, self.etherscan_key, 1

    def _validate_address(self, address: str) -> bool:
        return bool(re.match(r"^0x[a-fA-F0-9]{40}$", address))

    async def get_contract_source(self, address: str, chain: str = "ethereum") -> Dict[str, Any]:
        """Fetch verified contract source code, ABI, and name from Explorer API"""
        if not self._validate_address(address):
            raise ValueError(f"Địa chỉ ví/contract không hợp lệ: {address}")

        # Check MongoDB cache first
        try:
            db = MongoDBManager.get_db()
            cached = await db["contract_cache"].find_one({"address": address.lower(), "chain": chain.lower()})
            if cached:
                return {
                    "address": address,
                    "chain": chain,
                    "contract_name": cached.get("contract_name", "Unknown"),
                    "source_code": cached.get("source_code", ""),
                    "abi": cached.get("abi", ""),
                    "is_cached": True
                }
        except Exception as e:
            print(f"[BlockchainService] Cache lookup error: {e}")

        api_url, api_key, chain_id = self._get_api_url_key_and_chainid(chain)
        if not api_key or api_key == "your-etherscan-api-key":
            raise RuntimeError("Chưa cấu hình API Key Etherscan (ETHERSCAN_API_KEY)")

        params = {
            "module": "contract",
            "action": "getsourcecode",
            "address": address,
            "apikey": api_key,
            "chainid": str(chain_id)
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(api_url, params=params)
            if resp.status_code != 200:
                raise RuntimeError(f"Lỗi kết nối tới Blockchain Explorer (HTTP {resp.status_code})")
            
            data = resp.json()
            if data.get("status") != "1" or not data.get("result"):
                detail = data.get("message") or data.get("result") or "Contract chưa verify mã nguồn"
                raise RuntimeError(f"Không thể lấy mã nguồn từ Explorer: {detail}")

            item = data["result"][0]
            source_code = item.get("SourceCode", "")
            contract_name = item.get("ContractName", "Unknown")
            abi = item.get("ABI", "")

            if not source_code:
                raise RuntimeError("Contract này chưa được verify mã nguồn trên Explorer (Unverified Contract)")

            # Handle multi-file JSON source format from Etherscan
            if source_code.startswith("{{") and source_code.endswith("}}"):
                try:
                    import json
                    cleaned_json = source_code[1:-1]
                    parsed = json.loads(cleaned_json)
                    sources_dict = parsed.get("sources", {})
                    combined_source = ""
                    for fname, content in sources_dict.items():
                        combined_source += f"\n// File: {fname}\n" + content.get("content", "") + "\n"
                    source_code = combined_source
                except Exception:
                    pass
            elif source_code.startswith("{") and source_code.endswith("}"):
                try:
                    import json
                    parsed = json.loads(source_code)
                    sources_dict = parsed.get("sources", {})
                    combined_source = ""
                    for fname, content in sources_dict.items():
                        combined_source += f"\n// File: {fname}\n" + content.get("content", "") + "\n"
                    source_code = combined_source
                except Exception:
                    pass

            # Cache to MongoDB
            try:
                db = MongoDBManager.get_db()
                await db["contract_cache"].update_one(
                    {"address": address.lower(), "chain": chain.lower()},
                    {"$set": {
                        "address": address.lower(),
                        "chain": chain.lower(),
                        "contract_name": contract_name,
                        "source_code": source_code,
                        "abi": abi,
                        "cached_at": datetime.utcnow()
                    }},
                    upsert=True
                )
            except Exception as e:
                print(f"[BlockchainService] Failed to cache contract: {e}")

            return {
                "address": address,
                "chain": chain,
                "contract_name": contract_name,
                "source_code": source_code,
                "abi": abi,
                "is_cached": False
            }
