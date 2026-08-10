'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteFormButtonProps {
  formId: string
  formTitle: string
}

export function DeleteFormButton({ formId, formTitle }: DeleteFormButtonProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const handleDelete = async () => {
    setIsDeleting(true)
    const response = await fetch(`/api/forms/${formId}`, { method: 'DELETE' })

    if (!response.ok) {
      toast.error('מחיקת הטופס נכשלה')
      setIsDeleting(false)
    } else {
      toast.success('הטופס נמחק')
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      <DropdownMenuItem
        onClick={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
        className="cursor-pointer text-red-600 focus:text-red-600"
      >
        <Trash2 className="me-2 h-4 w-4" />
        מחיקה
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>מחיקת טופס</DialogTitle>
            <DialogDescription>
              למחוק את &quot;{formTitle || 'טופס ללא שם'}&quot;?
              לא ניתן לבטל את הפעולה, וגם כל התשובות יימחקו.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'מוחק...' : 'מחיקת הטופס'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
