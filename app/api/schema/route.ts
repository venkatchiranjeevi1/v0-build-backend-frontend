import { NextResponse } from "next/server"

export async function GET() {
  const schema = {
    tables: {
      employees: {
        columns: ["id", "name", "email", "department", "position", "salary", "hire_date"],
        description: "Employee information including personal details and job information",
      },
      departments: {
        columns: ["id", "name", "manager_id", "budget"],
        description: "Department information with manager and budget details",
      },
      documents: {
        columns: ["id", "title", "content", "author", "created_date"],
        description: "Company documents and files",
      },
    },
    sample_data: {
      employees: 10,
      departments: 4,
      documents: 5,
    },
  }

  return NextResponse.json(schema)
}
