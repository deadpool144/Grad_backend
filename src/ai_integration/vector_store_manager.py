import os
import sys
from langchain_community.vectorstores import FAISS

def create_vector_store(chunks, embeddings):
    """
    Creates a new FAISS vector store from document chunks and embedding model.
    """
    if not chunks:
        raise ValueError("Cannot create vector store: Document chunks list is empty.")
        
    print(f"Creating vector store for {len(chunks)} chunks...", file=sys.stderr)
    vector_store = FAISS.from_documents(chunks, embeddings)
    return vector_store

def save_vector_store(vector_store, path):
    """
    Saves the FAISS vector store local files to a directory.
    """
    print(f"Saving vector store index to: '{path}'...", file=sys.stderr)
    vector_store.save_local(path)
    print("Vector store saved successfully.", file=sys.stderr)

def load_vector_store(path, embeddings):
    """
    Loads a persisted local FAISS vector store index.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"Vector store directory not found at: '{path}'")
        
    print(f"Loading vector store index from '{path}'...", file=sys.stderr)
    # allow_dangerous_deserialization=True is required since we trust and load our own locally built FAISS index.
    vector_store = FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
    print("Vector store loaded successfully.", file=sys.stderr)
    return vector_store

def get_retriever(vector_store, top_k=3, search_type="mmr"):
    """
    Converts a vector store into a retriever.
    Using MMR (Maximal Marginal Relevance) provides higher diversity and prevents duplicate content chunks.
    """
    return vector_store.as_retriever(
        search_type=search_type,
        search_kwargs={"k": top_k}
    )
