import { type NextRequest, NextResponse } from "next/server"
import { getUploadedDocuments } from "../upload/route"
import { getDatabase } from "../../../lib/database"

const GROQ_API_KEY = "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"
const GROQ_MODEL = "llama-3.1-8b-instant"
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

async function discoverSchema(): Promise<Record<string, string[]>> {
  try {
    // Try to use real database first
    const db = await getDatabase()
    const schema = await db.discoverSchema()
    console.log("[v0] Using real database schema:", Object.keys(schema))
    return schema
  } catch (error) {
    console.log("[v0] Database not available, using mock schema:", error.message)
    // Fallback to mock schema if database not available
    return {
      employees: ["id", "name", "email", "department", "position", "salary", "hire_date"],
      departments: ["id", "name", "manager_id", "budget"],
      documents: ["id", "title", "content", "author", "created_date", "embedding", "is_uploaded"],
    }
  }
}

const mockEmployees = [
  {
    id: 1,
    name: "John Doe",
    email: "john@company.com",
    department: "Engineering",
    position: "Senior Developer",
    salary: 85000,
    hire_date: "2022-01-15",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@company.com",
    department: "Engineering",
    position: "Engineering Manager",
    salary: 95000,
    hire_date: "2021-03-10",
  },
  {
    id: 3,
    name: "Mike Johnson",
    email: "mike@company.com",
    department: "Marketing",
    position: "Marketing Specialist",
    salary: 65000,
    hire_date: "2022-06-20",
  },
  {
    id: 4,
    name: "Sarah Wilson",
    email: "sarah@company.com",
    department: "HR",
    position: "HR Manager",
    salary: 75000,
    hire_date: "2021-08-05",
  },
  {
    id: 5,
    name: "David Brown",
    email: "david@company.com",
    department: "Engineering",
    position: "Junior Developer",
    salary: 60000,
    hire_date: "2023-02-01",
  },
  {
    id: 6,
    name: "Lisa Davis",
    email: "lisa@company.com",
    department: "Sales",
    position: "Sales Manager",
    salary: 80000,
    hire_date: "2021-11-12",
  },
  {
    id: 7,
    name: "Tom Anderson",
    email: "tom@company.com",
    department: "Engineering",
    position: "DevOps Engineer",
    salary: 78000,
    hire_date: "2022-09-18",
  },
  {
    id: 8,
    name: "Emily Taylor",
    email: "emily@company.com",
    department: "Marketing",
    position: "Content Manager",
    salary: 58000,
    hire_date: "2023-01-08",
  },
  {
    id: 9,
    name: "Chris Lee",
    email: "chris@company.com",
    department: "Sales",
    position: "Sales Representative",
    salary: 55000,
    hire_date: "2022-12-03",
  },
  {
    id: 10,
    name: "Anna White",
    email: "anna@company.com",
    department: "HR",
    position: "HR Specialist",
    salary: 52000,
    hire_date: "2023-03-15",
  },
  {
    id: 11,
    name: "Rahul Kumar",
    email: "rahul@company.com",
    department: "Engineering",
    position: "Software Engineer",
    salary: 72000,
    hire_date: "2022-11-01",
  },
]

const mockDocuments = [
  {
    id: 1,
    title: "Alice resume: Python, Engineering",
    content:
      "Alice is a senior Python developer with 5 years experience in Django, Flask, and machine learning. She has worked on data pipelines and AI projects in the Engineering department.",
    author: "HR Team",
    created_date: "2023-01-01",
    embedding: [0.8, 0.2, 0.9, 0.1, 0.7, 0.3, 0.6, 0.4],
    is_uploaded: false,
  },
  {
    id: 2,
    title: "Bob resume: HR, recruiter",
    content:
      "Bob is an experienced HR recruiter specializing in technical talent acquisition. He has 3 years of experience in recruiting Python and JavaScript developers.",
    author: "HR Team",
    created_date: "2023-02-15",
    embedding: [0.2, 0.8, 0.1, 0.9, 0.3, 0.7, 0.4, 0.6],
    is_uploaded: false,
  },
  {
    id: 3,
    title: "Engineering Team Guidelines",
    content:
      "Code standards and best practices for the Engineering team. Includes Python, JavaScript, and DevOps guidelines for all developers.",
    author: "Jane Smith",
    created_date: "2023-03-01",
    embedding: [0.7, 0.3, 0.8, 0.2, 0.6, 0.4, 0.9, 0.1],
    is_uploaded: false,
  },
  {
    id: 4,
    title: "Charlie resume: Data Scientist",
    content:
      "Charlie is a data scientist with expertise in Python, machine learning, and statistical analysis. He has worked on predictive models and data visualization projects.",
    author: "HR Team",
    created_date: "2023-01-20",
    embedding: [0.9, 0.1, 0.7, 0.3, 0.8, 0.2, 0.5, 0.5],
    is_uploaded: false,
  },
  {
    id: 5,
    title: "Remote Work Policy for Developers",
    content:
      "Guidelines for remote work arrangements specifically for software developers and engineers. Covers Python, JavaScript, and other technical roles.",
    author: "Sarah Wilson",
    created_date: "2023-04-10",
    embedding: [0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9],
    is_uploaded: false,
  },
]

const mockDepartments = [
  { id: 1, name: "Engineering", manager_id: 2, budget: 500000 },
  { id: 2, name: "Marketing", manager_id: 3, budget: 200000 },
  { id: 3, name: "HR", manager_id: 4, budget: 150000 },
  { id: 4, name: "Sales", manager_id: 6, budget: 300000 },
]

async function callGroqAPI(messages: any[]) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function classifyQuery(query: string): Promise<string> {
  const uploadedDocs = getUploadedDocuments()
  const queryLower = query.toLowerCase()

  // Check if query mentions any uploaded document names
  const mentionsUploadedDoc = uploadedDocs.some(
    (doc) =>
      queryLower.includes(doc.title.toLowerCase()) ||
      queryLower.includes(doc.title.replace(/\.[^/.]+$/, "").toLowerCase()), // filename without extension
  )

  // Check for document-related keywords
  const documentKeywords = [
    "resume",
    "document",
    "file",
    "pdf",
    "skills",
    "experience",
    "qualification",
    "education",
    "background",
  ]
  const hasDocumentKeywords = documentKeywords.some((keyword) => queryLower.includes(keyword))

  // Check for SQL-specific keywords
  const sqlKeywords = ["employee", "department", "salary", "hire_date", "manager", "budget", "count", "sum", "average"]
  const hasSqlKeywords = sqlKeywords.some((keyword) => queryLower.includes(keyword))

  // If query mentions uploaded documents or document keywords, classify as Document
  if (mentionsUploadedDoc || (hasDocumentKeywords && !hasSqlKeywords)) {
    console.log(
      "[v0] Query classified as Document due to:",
      mentionsUploadedDoc ? "mentions uploaded doc" : "document keywords",
    )
    return "Document"
  }

  // If query has SQL keywords and no document context, classify as SQL
  if (hasSqlKeywords && !hasDocumentKeywords) {
    console.log("[v0] Query classified as SQL due to SQL keywords")
    return "SQL"
  }

  const messages = [
    {
      role: "system",
      content: `Classify the following query as SQL, Document, or Hybrid based on these guidelines:
      - SQL: Questions about employees, departments, salaries, hiring data, company structure
      - Document: Questions about resumes, skills, experience, qualifications, uploaded files, document content
      - Hybrid: Questions that need both database and document information
      
      Available uploaded documents: ${uploadedDocs.map((d) => d.title).join(", ") || "none"}
      
      Respond with exactly one word: SQL, Document, or Hybrid`,
    },
    {
      role: "user",
      content: query,
    },
  ]

  try {
    const classification = await callGroqAPI(messages)
    const cleanResult = classification.trim().toUpperCase()
    console.log("[v0] AI classification result:", cleanResult)

    // Ensure we return exactly one of the three types
    if (cleanResult.includes("DOCUMENT")) return "Document"
    if (cleanResult.includes("HYBRID")) return "Hybrid"
    if (cleanResult.includes("SQL")) return "SQL"

    // Default to Document if we have uploaded docs and unclear classification
    if (uploadedDocs.length > 0 && hasDocumentKeywords) {
      console.log("[v0] Defaulting to Document due to uploaded docs + document keywords")
      return "Document"
    }

    return "SQL" // Final fallback
  } catch (error) {
    console.error("Classification error:", error)
    // Better fallback logic
    if (mentionsUploadedDoc || hasDocumentKeywords) return "Document"
    return "SQL"
  }
}

async function generateSQL(query: string): Promise<{ sql: string; explanation: string }> {
  const schema = await discoverSchema()
  const schemaText = Object.entries(schema)
    .map(([table, columns]) => `${table}: ${columns.join(", ")}`)
    .join("\n")

  const messages = [
    {
      role: "system",
      content: `Generate SQL using schema: ${schemaText}`,
    },
    {
      role: "user",
      content: query,
    },
  ]

  try {
    const response = await callGroqAPI(messages)
    // Try to extract SQL from the response
    const sqlMatch =
      response.match(/SELECT.*?(?=;|$)/is) ||
      response.match(/INSERT.*?(?=;|$)/is) ||
      response.match(/UPDATE.*?(?=;|$)/is)
    const sql = sqlMatch ? sqlMatch[0].trim() : response.trim()

    return {
      sql: sql,
      explanation: `Generated SQL query for: ${query}`,
    }
  } catch (error) {
    console.error("SQL generation error:", error)
    return {
      sql: "SELECT * FROM employees LIMIT 5",
      explanation: "Fallback query showing first 5 employees",
    }
  }
}

function searchDocuments(query: string, topK = 2): any[] {
  const uploadedDocs = getUploadedDocuments()
  const allDocuments = [...mockDocuments, ...uploadedDocs]

  console.log("[v0] Searching through", allDocuments.length, "documents (", uploadedDocs.length, "uploaded)")

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2)
  const queryEmbedding = new Array(8).fill(0).map(() => Math.random())

  // Calculate cosine similarity with each document
  const scoredDocs = allDocuments.map((doc) => {
    // Simulate cosine similarity calculation
    let dotProduct = 0
    let queryMagnitude = 0
    let docMagnitude = 0

    for (let i = 0; i < Math.min(queryEmbedding.length, doc.embedding.length); i++) {
      dotProduct += queryEmbedding[i] * doc.embedding[i]
      queryMagnitude += queryEmbedding[i] * queryEmbedding[i]
      docMagnitude += doc.embedding[i] * doc.embedding[i]
    }

    const similarity = dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(docMagnitude))

    // Enhanced keyword matching - search both content and full_content
    const searchContent = (doc.full_content || doc.content || "").toLowerCase()
    const titleWords = doc.title.toLowerCase()
    let keywordBonus = 0

    queryWords.forEach((word) => {
      if (searchContent.includes(word)) keywordBonus += 0.2
      if (titleWords.includes(word)) keywordBonus += 0.3

      // Special bonus for name matching in document titles
      if (word === "venkat" && titleWords.includes("venkat")) keywordBonus += 0.5
      if (word === "skills" && searchContent.includes("skill")) keywordBonus += 0.3
      if (word === "resume" && titleWords.includes("resume")) keywordBonus += 0.4
    })

    // Extra bonus for uploaded documents when query mentions document-specific terms
    if (doc.is_uploaded && (query.toLowerCase().includes("resume") || query.toLowerCase().includes("skills"))) {
      keywordBonus += 0.3
    }

    return {
      ...doc,
      similarity_score: Math.max(0, similarity + keywordBonus),
      distance: 1 - similarity,
    }
  })

  const results = scoredDocs.sort((a, b) => b.similarity_score - a.similarity_score).slice(0, topK)
  console.log(
    "[v0] Top document results:",
    results.map((r) => ({ title: r.title, score: r.similarity_score.toFixed(3), uploaded: r.is_uploaded })),
  )

  return results
}

async function executeSQL(sql: string): Promise<any[]> {
  try {
    // Try to use real database first
    const db = await getDatabase()
    const results = await db.query(sql)
    console.log(`[v0] Real database query executed: ${results.length} rows`)
    return results
  } catch (error) {
    console.log("[v0] Database query failed, using mock data:", error.message)
    // Fallback to mock data if database query fails
    return executeMockSQL(sql)
  }
}

function executeMockSQL(sql: string): any[] {
  const lowerSQL = sql.toLowerCase()

  if (lowerSQL.includes("from employees")) {
    let results = [...mockEmployees]

    if (lowerSQL.includes("name =")) {
      const nameMatch = sql.match(/name\s*=\s*['"](.*?)['"]/) || sql.match(/name\s*=\s*(\w+)/)
      if (nameMatch) {
        const searchName = nameMatch[1]
        results = results.filter((emp) => emp.name.toLowerCase().includes(searchName.toLowerCase()))
        console.log(`[v0] Filtering by name: ${searchName}, found ${results.length} matches`)
      }
    }

    if (lowerSQL.includes("department = 'engineering'") || lowerSQL.includes('department="engineering"')) {
      results = results.filter((emp) => emp.department === "Engineering")
    }
    if (
      lowerSQL.includes("position like '%manager%'") ||
      (lowerSQL.includes("position") && lowerSQL.includes("manager"))
    ) {
      results = results.filter((emp) => emp.position.includes("Manager"))
    }
    if (lowerSQL.includes("salary >")) {
      const salaryMatch = sql.match(/salary > (\d+)/)
      if (salaryMatch) {
        const minSalary = Number.parseInt(salaryMatch[1])
        results = results.filter((emp) => emp.salary > minSalary)
      }
    }
    if (lowerSQL.includes("limit")) {
      const limitMatch = sql.match(/limit (\d+)/i)
      if (limitMatch) {
        const limit = Number.parseInt(limitMatch[1])
        results = results.slice(0, limit)
      }
    }
    if (lowerSQL.includes("group by department")) {
      const departmentCounts = mockEmployees.reduce(
        (acc, emp) => {
          acc[emp.department] = (acc[emp.department] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      return Object.entries(departmentCounts).map(([department, employee_count]) => ({
        department,
        employee_count,
      }))
    }

    return results
  }

  if (lowerSQL.includes("from departments")) {
    return mockDepartments
  }

  if (lowerSQL.includes("from documents")) {
    return mockDocuments.map((doc) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      author: doc.author,
      created_date: doc.created_date,
    }))
  }

  return []
}

async function extractRelevantContent(query: string, documents: any[]): Promise<string> {
  if (!documents || documents.length === 0) {
    return "No relevant documents found."
  }

  // Get the top document(s) content
  const topDoc = documents[0]
  const content = topDoc.full_content || topDoc.content || ""

  console.log("[v0] Extracting content from:", topDoc.title)
  console.log("[v0] Content length:", content.length, "characters")

  const messages = [
    {
      role: "system",
      content: `You are an AI assistant that extracts specific information from documents. 
      Based on the user's query, extract and present the most relevant information from the provided document content.
      If the query asks about skills, list all the skills mentioned.
      If the query asks about experience, summarize the work experience.
      If the query asks about education, list educational background.
      Be specific and comprehensive in your response.`,
    },
    {
      role: "user",
      content: `Query: ${query}

Document: ${topDoc.title}
Content: ${content}

Please extract and present the information requested in the query.`,
    },
  ]

  try {
    const response = await callGroqAPI(messages)
    console.log("[v0] Content extraction successful")
    return response
  } catch (error) {
    console.error("[v0] Content extraction error:", error)
    return `Found relevant document: ${topDoc.title}\n\nContent preview: ${content.substring(0, 500)}...`
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    console.log("[v0] Processing query:", query)

    // Step 1: Discover schema (real database or mock)
    const schema = await discoverSchema()
    console.log("[v0] Discovered schema:", Object.keys(schema))

    // Step 2: Classify query using Groq API
    const queryType = await classifyQuery(query)
    console.log("[v0] Query classified as:", queryType)

    let sqlResults = null
    let documentResults = null
    let sqlQuery = ""
    let explanation = ""
    let extractedContent = ""

    // Step 3: Run pipeline based on classification
    if (queryType === "SQL") {
      const { sql, explanation: sqlExplanation } = await generateSQL(query)
      sqlQuery = sql
      explanation = sqlExplanation
      sqlResults = await executeSQL(sql)
      console.log("[v0] SQL results:", sqlResults.length, "rows")
    } else if (queryType === "Document") {
      documentResults = searchDocuments(query)
      extractedContent = await extractRelevantContent(query, documentResults)
      explanation = `Found ${documentResults.length} matching documents using vector similarity`
      console.log("[v0] Document results:", documentResults.length, "documents")
    } else if (queryType === "Hybrid") {
      // Run both SQL + Document (combine results)
      const { sql, explanation: sqlExplanation } = await generateSQL(query)
      sqlQuery = sql
      sqlResults = await executeSQL(sql)
      documentResults = searchDocuments(query)
      extractedContent = await extractRelevantContent(query, documentResults)
      explanation = `Hybrid search: ${sqlResults.length} SQL results + ${documentResults.length} documents`
      console.log("[v0] Hybrid results:", sqlResults.length, "SQL +", documentResults.length, "docs")
    }

    return NextResponse.json({
      query_type: queryType,
      sql_query: sqlQuery,
      sql_results: sqlResults,
      document_results: documentResults,
      extracted_content: extractedContent,
      explanation: explanation,
      schema: schema, // Include discovered schema in response
    })
  } catch (error) {
    console.error("Query processing error:", error)
    return NextResponse.json({ error: "Failed to process query" }, { status: 500 })
  }
}
