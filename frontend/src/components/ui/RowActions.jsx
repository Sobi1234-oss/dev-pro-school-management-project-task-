import { Pencil, Trash2 } from 'lucide-react';
import Button from './Button';

export default function RowActions({ onEdit, onDelete }) {
  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Edit" onClick={onEdit}><Pencil size={16} /></Button>
      <Button variant="ghost" size="icon" aria-label="Delete" onClick={onDelete} className="hover:!bg-bad-100 hover:!text-bad"><Trash2 size={16} /></Button>
    </>
  );
}
