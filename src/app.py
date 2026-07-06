import os
import sys
from dotenv import load_dotenv
load_dotenv()
import streamlit as st
import pandas as pd
import joblib
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.rag_qa import retrieve, generate_answer_with_gemini
st.set_page_config(page_title='GenAI Security Scanner', page_icon='🛡️', layout='wide', initial_sidebar_state='expanded')
DATA_PATH = 'data/processed/findings.csv'
st.markdown('\n<style>\n    .main-header {font-size: 2.5rem; font-weight: 700; color: #1E88E5;}\n    .sub-header {font-size: 1.5rem; font-weight: 600; color: #424242;}\n    .card {padding: 1.5rem; border-radius: 10px; background-color: #f8f9fa; border: 1px solid #e0e0e0; margin-bottom: 1rem;}\n    .safe {color: #2e7d32; font-weight: bold;}\n    .vuln {color: #c62828; font-weight: bold;}\n</style>\n', unsafe_allow_html=True)
with st.sidebar:
    st.image('https://img.icons8.com/color/96/000000/security-shield-green.png', width=64)
    st.title('GenAI Security')
    st.markdown('### Blockchain Security Scanner')
    st.markdown('---')
    menu = st.radio('Menu:', ['📊 Dashboard', '🤖 AI Assistant (RAG)'], index=0)
if menu == '📊 Dashboard':
    st.markdown('<p class="main-header">📊 Security Overview</p>', unsafe_allow_html=True)
    if os.path.exists(DATA_PATH):
        df = pd.read_csv(DATA_PATH)
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric('Total Records', len(df))
        with col2:
            n_vuln = df['impact'].astype(str).str.upper().eq('HIGH').sum() if 'impact' in df.columns else 0
            st.metric('High Severity', n_vuln, delta_color='inverse')
        with col3:
            n_code = df['code'].notna().sum() if 'code' in df.columns else 0
            st.metric('Code Snippets', n_code)
        with col4:
            n_funcs = df['function_name'].nunique() if 'function_name' in df.columns else 0
            st.metric('Unique Functions', n_funcs)
        st.markdown('---')
        c1, c2 = st.columns(2)
        with c1:
            st.subheader('Phân bố mức độ nghiêm trọng (Impact)')
            if 'impact' in df.columns:
                st.bar_chart(df['impact'].value_counts())
        with c2:
            st.subheader('Top Vulnerability Types')
            if 'vulnerability_label' in df.columns:
                top_vulns = df['vulnerability_label'].value_counts().head(5)
                st.write(top_vulns)
    else:
        st.info('Chưa có dữ liệu. Vui lòng chạy pipeline xử lý dữ liệu trước.')
elif menu == '🤖 AI Assistant (RAG)':
    st.markdown('<p class="main-header">🤖 AI Security Assistant</p>', unsafe_allow_html=True)
    st.markdown('Hỏi đáp về bảo mật Smart Contract sử dụng **CodeBERT RAG** + **LLM**.')
    with st.form('chat_form'):
        user_query = st.text_input('Câu hỏi của bạn:', placeholder='Ví dụ: Reentrancy attack là gì và cách phòng tránh?')
        submitted = st.form_submit_button('Gửi câu hỏi')
    if submitted and user_query:
        try:
            with st.spinner('Đang tìm kiếm tài liệu và generate câu trả lời...'):
                docs = retrieve(user_query, k=6)
                api_key = os.getenv('GEMINI_API_KEY')
                answer = generate_answer_with_gemini(user_query, docs, api_key=api_key)
                st.markdown('### 💡 Câu trả lời')
                st.write(answer)
                st.markdown('---')
                st.markdown('### 📚 Tài liệu tham khảo')
                for i, doc in enumerate(docs, 1):
                    with st.expander(f"Document {i}: {doc['title']}"):
                        st.markdown(f"**Description:** {doc['content'][:500]}...")
                        if 'score' in doc:
                            st.caption(f"Relevance Score: {doc['score']:.4f}")
                        if 'dangerous_apis' in doc and doc['dangerous_apis']:
                            st.caption(f"Dangerous APIs: `{doc['dangerous_apis']}`")
                        if 'code' in doc and doc['code']:
                            st.code(doc['code'][:800] + ('\n...[truncated]...' if len(doc['code']) > 800 else ''))
        except Exception as e:
            st.error(f'Lỗi: {e}')
            if 'FAISS index không tồn tại' in str(e):
                st.warning('Vui lòng chạy file `src/ingest_to_vectorstore.py` để tạo dữ liệu tìm kiếm trước.')
st.markdown('---')
st.markdown('**GenAI for Blockchain Security** - Hệ thống phân tích và phát hiện lỗ hổng bảo mật trong Smart Contracts')
