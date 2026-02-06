import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db'

// Table ID mapping (from AgTablesSchema)
const TABLE_IDS: Record<string, number> = {
  category: 137,
  product: 157,
  grid_element: 200,
}

// Base host URL - get from request or environment
function getBaseHost(request: NextRequest): string {
  // Try to get from environment first
  if (process.env.BASE_HOST) {
    return process.env.BASE_HOST
  }
  // Fallback to request origin
  const origin = request.headers.get('origin') || request.headers.get('host')
  if (origin) {
    return origin.startsWith('http') ? origin : `http://${origin}`
  }
  // Last resort
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const id = formData.get('id') as string
    const table = formData.get('table') as string
    const type = formData.get('type') as string

    if (!file || !id || !table || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: file, id, table, type' },
        { status: 400 }
      )
    }

    const baseHost = getBaseHost(request)

    // Get table ID (use numeric ID if table is a number, otherwise lookup)
    const tableId = TABLE_IDS[table] || parseInt(table) || 137
    const attachmentType = parseInt(type)

    // Generate unique filename
    const uniqueId = randomBytes(10).toString('hex')
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${uniqueId}.${fileExtension}`

    // Create upload directory: public/uploads/{table_id}/{row_id}/ (matching old backend)
    // Old backend: Yii::getAlias('@webroot/uploads/137/' . $categoryId . '/')
    const uploadDir = join(process.cwd(), 'public', 'uploads', tableId.toString(), id)
    
    // Ensure directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file
    const filePath = join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Generate file path URL (matching old backend format: base_host/uploads/{table_id}/{row_id}/filename)
    // Old backend: base_host . '/' . 'uploads/137/' . $categoryId . '/' . $fileName
    const filePathUrl = `${baseHost}/uploads/${tableId}/${id}/${fileName}`

    // Save to ag_attachment table and update main_image if needed
    
    try {
      // Insert into ag_attachment table
      await prisma.$executeRawUnsafe(
        `INSERT INTO ag_attachment (table_name, row_id, type, file_path, file_name, file_extension, file_size, cdn_uploaded, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
        tableId.toString(),
        parseInt(id),
        attachmentType,
        filePathUrl,
        fileName,
        fileExtension,
        file.size.toString()
      )

      // If type is 1 (main image), update the category's main_image field
      if (attachmentType === 1 && table === 'category') {
        await prisma.$executeRawUnsafe(
          `UPDATE category SET main_image = ? WHERE id = ?`,
          filePathUrl,
          parseInt(id)
        )
      }
      
      // If type is 1 (main image), update the grid_element's main_image field
      if (attachmentType === 1 && table === 'grid_element') {
        await prisma.$executeRawUnsafe(
          `UPDATE grid_elements SET main_image = ? WHERE id = ?`,
          filePathUrl,
          parseInt(id)
        )
      }
    } catch (dbError) {
      console.error('Database error saving attachment (file still saved to disk):', dbError)
      // File is already saved to disk, so we continue
      // If ag_attachment insert fails, we still return success since file is saved
    }

    return NextResponse.json({
      success: true,
      file_path: filePathUrl,
      file_name: fileName,
      file_size: file.size,
      file_extension: fileExtension,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      },
      { status: 500 }
    )
  }
}

