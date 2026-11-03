import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { Input, Select, Textarea } from './Field';
import { FormError } from './States';
import { ApiError } from '../../lib/api';

/**
 * Config-driven create/edit dialog.
 * fields: [{ name, label, type, options?, placeholder?, hint?, full?, required? }]
 */
export default function ResourceForm({ open, title, fields, initial, submitLabel = 'Save', onSubmit, onClose }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(Object.fromEntries(fields.map((f) => [f.name, initial?.[f.name] ?? f.default ?? ''])));
      setErrors({});
      setFormError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const set = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    fields.forEach((f) => { if (f.required && !String(values[f.name]).trim()) local[f.name] = 'This field is required.'; });
    if (Object.keys(local).length) return setErrors(local);

    setBusy(true);
    setFormError('');
    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.fields || {}); setFormError(err.message); }
      else setFormError('Unexpected error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title={title} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="resource-form" loading={busy}>{submitLabel}</Button></>}>
      <form id="resource-form" onSubmit={submit} noValidate>
        <FormError>{formError}</FormError>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const common = { label: f.label, error: errors[f.name], hint: f.hint, value: values[f.name] ?? '', onChange: set(f.name), wrapperClass: f.full ? 'sm:col-span-2' : '' };
            return f.type === 'select'
              ? <Select key={f.name} {...common} options={f.options || []} placeholder={f.placeholder ?? 'Select…'} />
              : f.type === 'textarea'
                ? <Textarea key={f.name} {...common} placeholder={f.placeholder} maxLength={f.maxLength} />
                : <Input key={f.name} {...common} type={f.type || 'text'} placeholder={f.placeholder} maxLength={f.maxLength} step={f.type === 'number' ? 'any' : undefined} min={f.type === 'number' ? 0 : undefined} autoComplete="off" />;
          })}
        </div>
      </form>
    </Modal>
  );
}
