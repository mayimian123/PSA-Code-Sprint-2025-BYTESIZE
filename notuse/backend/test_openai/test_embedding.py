import os
import openai
from openai import AzureOpenAI
import json
import time
import numpy as np
from typing import Optional, List, Dict, Any
from sklearn.metrics.pairwise import cosine_similarity

class PSAOpenAIClient:
    def __init__(self):
        # 嵌入模型客户端
        self.embedding_client = AzureOpenAI(
            api_key="599e77bd8bbd4a8d967950f110922080",
            api_version="2023-05-15",
            azure_endpoint="https://psacodesprint2025.azure-api.net/text-embedding-3-small"
        )
        
        # LLM模型客户端
        self.llm_client = AzureOpenAI(
            api_key="b6b4f751603f426f876b6d634d76a6ef",
            api_version="2025-01-01-preview",
            azure_endpoint="https://psacodesprint2025.azure-api.net"
        )
        
        self.max_retries = 3
        self.retry_delay = 1  # 重试延迟（秒）

    def get_embedding(self, text: str, retry_count: int = 0) -> Optional[List[float]]:
        """获取文本的嵌入向量"""
        try:
            response = self.embedding_client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            if retry_count < self.max_retries:
                print(f"Getting embedding failed, retrying ({retry_count + 1}/{self.max_retries})")
                time.sleep(self.retry_delay)
                return self.get_embedding(text, retry_count + 1)
            print(f"Getting embedding finally failed: {str(e)}")
            return None

    def get_llm_response(self, 
                        system_prompt: str,
                        user_prompt: str,
                        context: str = "",
                        retry_count: int = 0) -> Optional[str]:
        """获取LLM响应"""
        try:
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            if context:
                messages.append({"role": "user", "content": f"Context information:\n{context}\n\nBased on the above context, please answer the following question."})
            
            messages.append({"role": "user", "content": user_prompt})
            
            completion = self.llm_client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=messages
            )
            return completion.choices[0].message.content
        except Exception as e:
            if retry_count < self.max_retries:
                print(f"Getting LLM response failed, retrying ({retry_count + 1}/{self.max_retries})")
                time.sleep(self.retry_delay)
                return self.get_llm_response(system_prompt, user_prompt, context, retry_count + 1)
            print(f"Getting LLM response finally failed: {str(e)}")
            return None

class RAGSystem:
    def __init__(self, client: PSAOpenAIClient):
        self.client = client
        self.document_chunks: List[str] = []
        self.document_embeddings: List[List[float]] = []
        
    def prepare_document(self, content: str, chunk_size: int = 1000):
        """将文档分块并计算嵌入向量"""
        # 简单的文本分块
        words = content.split()
        chunks = []
        current_chunk = []
        current_length = 0
        
        for word in words:
            current_chunk.append(word)
            current_length += len(word) + 1
            if current_length >= chunk_size:
                chunks.append(' '.join(current_chunk))
                current_chunk = []
                current_length = 0
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        self.document_chunks = chunks
        print(f"Document split into {len(chunks)} chunks")
        
        # 计算每个块的嵌入向量
        self.document_embeddings = []
        for chunk in chunks:
            embedding = self.client.get_embedding(chunk)
            if embedding:
                self.document_embeddings.append(embedding)
        
        print(f"Calculated embeddings for {len(self.document_embeddings)} chunks")
    
    def find_relevant_chunks(self, query: str, top_k: int = 3) -> List[str]:
        """找到与查询最相关的文档块"""
        query_embedding = self.client.get_embedding(query)
        if not query_embedding or not self.document_embeddings:
            return []
        
        # 计算余弦相似度
        similarities = cosine_similarity(
            [query_embedding],
            self.document_embeddings
        )[0]
        
        # 获取最相关的块
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        return [self.document_chunks[i] for i in top_indices]

def read_content(file_path: str) -> Optional[str]:
    """读取文件内容"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        print(f"Reading file failed: {str(e)}")
        return None

def save_embedding(embedding: List[float], output_file: str) -> bool:
    """保存嵌入向量到文件"""
    try:
        with open(output_file, 'w') as f:
            json.dump({"embedding": embedding}, f)
        return True
    except Exception as e:
        print(f"Saving embedding failed: {str(e)}")
        return False

def main():
    print("=== PSA OpenAI RAG Test Started ===")
    
    # 初始化客户端和RAG系统
    client = PSAOpenAIClient()
    rag = RAGSystem(client)
    
    # 文件路径
    content_file = '/Users/laurenma/Desktop/PSA/bytesize/PSA_text_full.txt'
    
    # 1. 准备文档
    print("\n1. Preparing Document")
    content = read_content(content_file)
    if content:
        rag.prepare_document(content)
    
    # 2. 测试RAG
    print("\n2. Testing RAG System")
    system_prompt = """You are a helpful assistant. Please provide clear and professional responses in English, focusing on accurate information about PSA."""

    user_questions = [
        "What is PSA and what are its main operations?",
        "What is the core business of PSA and how does it contribute to global trade?",
        "How extensive is PSA's global network and presence?"
    ]
    
    for question in user_questions:
        print(f"\nQuestion: {question}")
        
        # 获取相关上下文
        relevant_chunks = rag.find_relevant_chunks(question)
        context = "\n".join(relevant_chunks)
        print(f"Found {len(relevant_chunks)} relevant context chunks")
        
        # 获取LLM响应
        response = client.get_llm_response(system_prompt, question, context)
        if response:
            print(f"Answer: {response}")

    print("\n=== PSA OpenAI RAG Test Completed ===")

if __name__ == "__main__":
    main()