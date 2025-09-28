import asyncio
import uuid
import hashlib
from typing import List, Dict, Any, Optional, Tuple
import aiofiles
import logging
from datetime import datetime
import re
import json

# Document processing imports
import PyPDF2
from docx import Document as DocxDocument
import pandas as pd
from sentence_transformers import SentenceTransformer
import numpy as np

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """
    Process multiple document types and generate embeddings for semantic search
    """
    
    def __init__(self):
        # Initialize embedding model
        self.embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        
        # In-memory storage for demo (use vector database in production)
        self.document_store = {}
        self.embeddings_store = {}
        
        # Document type handlers
        self.handlers = {
            'application/pdf': self._process_pdf,
            'text/pdf': self._process_pdf,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': self._process_docx,
            'text/plain': self._process_text,
            'application/vnd.ms-excel': self._process_excel,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': self._process_excel,
            'text/csv': self._process_csv
        }

    async def process_document(self, filename: str, content: bytes, content_type: str) -> Dict[str, Any]:
        """
        Process a single document and generate embeddings
        """
        try:
            document_id = str(uuid.uuid4())
            
            # Extract text based on file type
            text_content = await self._extract_text(content, content_type, filename)
            
            if not text_content:
                raise ValueError(f"No text content extracted from {filename}")
            
            # Intelligent chunking
            chunks = self._dynamic_chunking(text_content, content_type, filename)
            
            # Generate embeddings for chunks
            embeddings = await self._generate_embeddings(chunks)
            
            # Store document and embeddings
            document_info = {
                'document_id': document_id,
                'filename': filename,
                'content_type': content_type,
                'processed_at': datetime.utcnow(),
                'total_chunks': len(chunks),
                'text_content': text_content[:1000],  # Store preview
                'metadata': self._extract_metadata(text_content, filename)
            }
            
            self.document_store[document_id] = document_info
            
            # Store chunks with embeddings
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                chunk_id = f"{document_id}_{i}"
                self.embeddings_store[chunk_id] = {
                    'document_id': document_id,
                    'chunk_index': i,
                    'content': chunk,
                    'embedding': embedding.tolist(),
                    'metadata': document_info['metadata']
                }
            
            return {
                'document_id': document_id,
                'chunks': len(chunks),
                'status': 'success'
            }
            
        except Exception as e:
            logger.error(f"Document processing failed for {filename}: {str(e)}")
            raise Exception(f"Failed to process document {filename}: {str(e)}")

    async def _extract_text(self, content: bytes, content_type: str, filename: str) -> str:
        """
        Extract text from different file types
        """
        # Determine handler based on content type or file extension
        handler = self.handlers.get(content_type)
        
        if not handler:
            # Try to determine from file extension
            extension = filename.lower().split('.')[-1] if '.' in filename else ''
            extension_mapping = {
                'pdf': self._process_pdf,
                'docx': self._process_docx,
                'txt': self._process_text,
                'csv': self._process_csv,
                'xlsx': self._process_excel,
                'xls': self._process_excel
            }
            handler = extension_mapping.get(extension, self._process_text)
        
        return await handler(content)

    async def _process_pdf(self, content: bytes) -> str:
        """
        Extract text from PDF files
        """
        try:
            import io
            pdf_file = io.BytesIO(content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text.strip()
        except Exception as e:
            logger.error(f"PDF processing failed: {str(e)}")
            return ""

    async def _process_docx(self, content: bytes) -> str:
        """
        Extract text from DOCX files
        """
        try:
            import io
            doc_file = io.BytesIO(content)
            doc = DocxDocument(doc_file)
            
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            return text.strip()
        except Exception as e:
            logger.error(f"DOCX processing failed: {str(e)}")
            return ""

    async def _process_text(self, content: bytes) -> str:
        """
        Process plain text files
        """
        try:
            return content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                return content.decode('latin-1')
            except Exception as e:
                logger.error(f"Text processing failed: {str(e)}")
                return ""

    async def _process_csv(self, content: bytes) -> str:
        """
        Process CSV files
        """
        try:
            import io
            csv_file = io.StringIO(content.decode('utf-8'))
            df = pd.read_csv(csv_file)
            
            # Convert DataFrame to readable text
            text = f"CSV Data with {len(df)} rows and {len(df.columns)} columns:\n"
            text += f"Columns: {', '.join(df.columns)}\n\n"
            
            # Add sample rows
            sample_size = min(10, len(df))
            for i in range(sample_size):
                row_text = " | ".join([f"{col}: {df.iloc[i][col]}" for col in df.columns])
                text += f"Row {i+1}: {row_text}\n"
            
            return text
        except Exception as e:
            logger.error(f"CSV processing failed: {str(e)}")
            return ""

    async def _process_excel(self, content: bytes) -> str:
        """
        Process Excel files
        """
        try:
            import io
            excel_file = io.BytesIO(content)
            df = pd.read_excel(excel_file)
            
            # Convert DataFrame to readable text
            text = f"Excel Data with {len(df)} rows and {len(df.columns)} columns:\n"
            text += f"Columns: {', '.join(df.columns)}\n\n"
            
            # Add sample rows
            sample_size = min(10, len(df))
            for i in range(sample_size):
                row_text = " | ".join([f"{col}: {df.iloc[i][col]}" for col in df.columns])
                text += f"Row {i+1}: {row_text}\n"
            
            return text
        except Exception as e:
            logger.error(f"Excel processing failed: {str(e)}")
            return ""

    def _dynamic_chunking(self, content: str, content_type: str, filename: str) -> List[str]:
        """
        Intelligent chunking based on document structure
        """
        # Determine optimal chunk size based on document type
        if 'resume' in filename.lower() or 'cv' in filename.lower():
            return self._chunk_resume(content)
        elif 'contract' in filename.lower() or 'agreement' in filename.lower():
            return self._chunk_contract(content)
        elif 'review' in filename.lower() or 'evaluation' in filename.lower():
            return self._chunk_review(content)
        else:
            return self._chunk_generic(content)

    def _chunk_resume(self, content: str) -> List[str]:
        """
        Chunk resume keeping skills and experience sections together
        """
        chunks = []
        
        # Split by common resume sections
        sections = re.split(r'\n(?=(?:EXPERIENCE|EDUCATION|SKILLS|SUMMARY|OBJECTIVE|PROJECTS))', content, flags=re.IGNORECASE)
        
        for section in sections:
            if len(section.strip()) > 50:  # Minimum chunk size
                if len(section) > 1000:  # If section too large, split further
                    sub_chunks = self._split_by_sentences(section, max_length=800)
                    chunks.extend(sub_chunks)
                else:
                    chunks.append(section.strip())
        
        return chunks if chunks else self._chunk_generic(content)

    def _chunk_contract(self, content: str) -> List[str]:
        """
        Chunk contracts preserving clause boundaries
        """
        chunks = []
        
        # Split by numbered clauses or sections
        sections = re.split(r'\n(?=\d+\.|$$[a-z]$$|$$[0-9]+$$)', content)
        
        for section in sections:
            if len(section.strip()) > 50:
                chunks.append(section.strip())
        
        return chunks if chunks else self._chunk_generic(content)

    def _chunk_review(self, content: str) -> List[str]:
        """
        Chunk reviews maintaining paragraph integrity
        """
        paragraphs = content.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for paragraph in paragraphs:
            if len(current_chunk + paragraph) > 800:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = paragraph
            else:
                current_chunk += "\n\n" + paragraph if current_chunk else paragraph
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks if chunks else self._chunk_generic(content)

    def _chunk_generic(self, content: str, max_length: int = 800) -> List[str]:
        """
        Generic chunking strategy
        """
        return self._split_by_sentences(content, max_length)

    def _split_by_sentences(self, text: str, max_length: int = 800) -> List[str]:
        """
        Split text by sentences while respecting max length
        """
        sentences = re.split(r'(?<=[.!?])\s+', text)
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk + sentence) > max_length:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence
            else:
                current_chunk += " " + sentence if current_chunk else sentence
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks

    async def _generate_embeddings(self, chunks: List[str]) -> List[np.ndarray]:
        """
        Generate embeddings for text chunks in batches
        """
        try:
            # Process in batches for efficiency
            batch_size = 32
            embeddings = []
            
            for i in range(0, len(chunks), batch_size):
                batch = chunks[i:i + batch_size]
                batch_embeddings = self.embedding_model.encode(batch)
                embeddings.extend(batch_embeddings)
            
            return embeddings
        except Exception as e:
            logger.error(f"Embedding generation failed: {str(e)}")
            raise

    def _extract_metadata(self, content: str, filename: str) -> Dict[str, Any]:
        """
        Extract metadata from document content
        """
        metadata = {
            'filename': filename,
            'word_count': len(content.split()),
            'char_count': len(content),
            'document_type': self._infer_document_type(content, filename)
        }
        
        # Extract specific information based on document type
        if metadata['document_type'] == 'resume':
            metadata.update(self._extract_resume_metadata(content))
        elif metadata['document_type'] == 'review':
            metadata.update(self._extract_review_metadata(content))
        
        return metadata

    def _infer_document_type(self, content: str, filename: str) -> str:
        """
        Infer document type from content and filename
        """
        content_lower = content.lower()
        filename_lower = filename.lower()
        
        if any(word in filename_lower for word in ['resume', 'cv']):
            return 'resume'
        elif any(word in filename_lower for word in ['review', 'evaluation', 'performance']):
            return 'review'
        elif any(word in filename_lower for word in ['contract', 'agreement']):
            return 'contract'
        elif any(word in content_lower for word in ['experience', 'education', 'skills']):
            return 'resume'
        elif any(word in content_lower for word in ['performance', 'rating', 'evaluation']):
            return 'review'
        else:
            return 'document'

    def _extract_resume_metadata(self, content: str) -> Dict[str, Any]:
        """
        Extract resume-specific metadata
        """
        metadata = {}
        
        # Extract email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, content)
        if emails:
            metadata['email'] = emails[0]
        
        # Extract phone numbers
        phone_pattern = r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'
        phones = re.findall(phone_pattern, content)
        if phones:
            metadata['phone'] = phones[0]
        
        # Extract skills (simple keyword extraction)
        skill_keywords = ['python', 'java', 'javascript', 'sql', 'react', 'node', 'aws', 'docker', 'kubernetes']
        found_skills = [skill for skill in skill_keywords if skill in content.lower()]
        if found_skills:
            metadata['skills'] = found_skills
        
        return metadata

    def _extract_review_metadata(self, content: str) -> Dict[str, Any]:
        """
        Extract review-specific metadata
        """
        metadata = {}
        
        # Extract rating if present
        rating_pattern = r'(?:rating|score):\s*(\d+(?:\.\d+)?)'
        ratings = re.findall(rating_pattern, content.lower())
        if ratings:
            metadata['rating'] = float(ratings[0])
        
        return metadata

    async def search_documents(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search documents using semantic similarity
        """
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode([query])[0]
            
            # Calculate similarities
            similarities = []
            for chunk_id, chunk_data in self.embeddings_store.items():
                chunk_embedding = np.array(chunk_data['embedding'])
                similarity = np.dot(query_embedding, chunk_embedding) / (
                    np.linalg.norm(query_embedding) * np.linalg.norm(chunk_embedding)
                )
                similarities.append({
                    'chunk_id': chunk_id,
                    'similarity': similarity,
                    'content': chunk_data['content'],
                    'document_id': chunk_data['document_id'],
                    'metadata': chunk_data['metadata']
                })
            
            # Sort by similarity and return top results
            similarities.sort(key=lambda x: x['similarity'], reverse=True)
            
            results = []
            for item in similarities[:limit]:
                document_info = self.document_store.get(item['document_id'], {})
                results.append({
                    'document_id': item['document_id'],
                    'filename': document_info.get('filename', 'Unknown'),
                    'content': item['content'],
                    'similarity': item['similarity'],
                    'metadata': item['metadata']
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Document search failed: {str(e)}")
            return []
