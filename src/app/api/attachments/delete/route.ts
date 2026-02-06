import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

// Table ID mapping
const TABLE_IDS: Record<string, number> = {
  category: 137,
  product: 157,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { file_path, table, id, type } = body

    if (!file_path || !table || !id || type === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: file_path, table, id, type' },
        { status: 400 }
      )
    }

    const tableId = TABLE_IDS[table] || parseInt(table) || 137
    const attachmentType = parseInt(type)
    const rowId = parseInt(id)

    // Delete from ag_attachment table
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM ag_attachment 
         WHERE table_name = ? AND row_id = ? AND file_path = ? AND type = ?`,
        tableId.toString(),
        rowId,
        file_path,
        attachmentType
      )
    } catch (dbError) {
      console.error('Database error deleting attachment:', dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete attachment from database' },
        { status: 500 }
      )
    }

    // If type is 1 (main image), update the category/product main_image field to null
    if (attachmentType === 1) {
      try {
        if (table === 'category') {
          await prisma.$executeRawUnsafe(
            `UPDATE category SET main_image = NULL WHERE id = ?`,
            rowId
          )
        } else if (table === 'product') {
          await prisma.$executeRawUnsafe(
            `UPDATE product SET main_image = NULL WHERE id = ?`,
            rowId
          )
        }
      } catch (updateError) {
        console.error('Error updating main_image field:', updateError)
        // Continue even if this fails - attachment is already deleted
      }
    }

    // Delete physical file from disk
    try {
      let filePath: string
      
      // Handle both URL and relative path formats
      // Old backend format: base_host/uploads/{table_id}/{row_id}/filename
      if (file_path.startsWith('http://') || file_path.startsWith('https://')) {
        // Extract relative path from file_path URL
        // file_path format: http://host/uploads/137/id/filename
        const urlParts = new URL(file_path)
        const pathParts = urlParts.pathname.split('/')
        const uploadsIndex = pathParts.indexOf('uploads')
        
        if (uploadsIndex !== -1) {
          // Reconstruct path: uploads/{table_id}/{row_id}/filename
          const relativePath = pathParts.slice(uploadsIndex).join('/')
          filePath = join(process.cwd(), 'public', relativePath)
        } else {
          // If uploads not found in path, skip file deletion
          console.warn('Could not extract uploads path from URL:', file_path)
          return NextResponse.json({
            success: true,
            message: 'Attachment deleted from database (file path not found)',
          })
        }
      } else {
        // Assume it's a relative path (e.g., "uploads/137/123/file.jpg")
        // Remove leading slash if present
        const relativePath = file_path.startsWith('/') ? file_path.slice(1) : file_path
        filePath = join(process.cwd(), 'public', relativePath)
      }
      
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
    } catch (fileError) {
      console.error('Error deleting file from disk:', fileError)
      // Continue even if file deletion fails - database record is already deleted
    }

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully',
    })
  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete attachment',
      },
      { status: 500 }
    )
  }
}

