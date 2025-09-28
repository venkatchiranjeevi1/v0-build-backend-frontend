import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for uploaded documents (in production, use a database)
const uploadedDocuments: any[] = []

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Document upload request received")
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      console.log("[v0] No files provided in upload request")
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    console.log(`[v0] Processing ${files.length} uploaded files`)
    const processedFiles = []

    for (const file of files) {
      console.log(`[v0] Processing uploaded file: ${file.name} (${file.size} bytes, ${file.type})`)

      // Read file content
      const content = await file.text()
      console.log(`[v0] File content length: ${content.length} characters`)

      // Generate a simple embedding (in production, use a real embedding model)
      const words = content.toLowerCase().split(/\s+/)
      const embedding = new Array(8).fill(0).map(() => Math.random())

      // Create document entry
      const document = {
        id: uploadedDocuments.length + 100, // Avoid conflicts with mock data
        title: file.name,
        content: content.substring(0, 500) + (content.length > 500 ? "..." : ""), // Truncate for display
        full_content: content, // Store full content for search
        author: "User Upload",
        created_date: new Date().toISOString().split("T")[0],
        file_type: file.type,
        file_size: file.size,
        embedding: embedding,
        is_uploaded: true, // Flag to distinguish from mock data
      }

      uploadedDocuments.push(document)
      processedFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
        id: document.id,
      })

      console.log(`[v0] Successfully processed document: ${document.title} (ID: ${document.id})`)
    }

    console.log(`[v0] Upload complete. Total documents in storage: ${uploadedDocuments.length}`)
    return NextResponse.json({
      success: true,
      processed_files: processedFiles,
      total_documents: uploadedDocuments.length,
    })
  } catch (error) {
    console.error("[v0] Upload processing error:", error)
    return NextResponse.json({ error: "Failed to process uploads" }, { status: 500 })
  }
}

// Export function to get uploaded documents (for use in query API)
export function getUploadedDocuments() {
  return uploadedDocuments
}
