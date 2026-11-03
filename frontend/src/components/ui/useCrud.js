import { useState } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

/** Shared create / edit / delete flow for list pages. */
export function useCrud({ endpoint, noun, reload }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null); // null | {} (create) | row (edit)
  const [deleting, setDeleting] = useState(null);

  const save = async (values) => {
    const isEdit = Boolean(editing?.id);
    await (isEdit ? api.put(`${endpoint}/${editing.id}`, values) : api.post(endpoint, values));
    toast.success(`${noun} ${isEdit ? 'updated' : 'added'}.`);
    setEditing(null);
    reload();
  };

  const remove = async () => {
    try {
      await api.del(`${endpoint}/${deleting.id}`);
      toast.success(`${noun} deleted.`);
      setDeleting(null);
      reload();
    } catch (e) {
      toast.error(e.message);
      setDeleting(null);
    }
  };

  return { editing, setEditing, deleting, setDeleting, save, remove };
}
