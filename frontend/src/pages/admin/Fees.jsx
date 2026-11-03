import { useState } from 'react';
import { Check, ReceiptText, Sparkles, Trash2, Wallet } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatMonth, money, thisMonth, todayISO } from '../../lib/format';
import PageHeader from '../../components/ui/PageHeader';
import Card, { Stat } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SearchBox from '../../components/ui/SearchBox';
import { Input, Select } from '../../components/ui/Field';
import DataTable from '../../components/ui/DataTable';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/States';
import ResourceForm from '../../components/ui/ResourceForm';
import Modal from '../../components/ui/Modal';

function ReceiptHistory({ fee, onClose }) {
  const { data, loading, error, reload } = useAsync(() => api.get(`/fees/${fee.id}/payments`), [fee.id]);
  const columns = [
    { key: 'receipt_number', header: 'Receipt', primary: true },
    { key: 'paid_on', header: 'Date', render: (row) => formatDate(row.paid_on) },
    { key: 'payment_method', header: 'Method' },
    { key: 'amount', header: 'Amount', render: (row) => money(row.amount) },
    { key: 'reference', header: 'Reference' },
  ];
  return (
    <Modal open title={`Receipts · ${fee.student_name}`} onClose={onClose}>
      <DataTable columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload}
        empty={<EmptyState icon={ReceiptText} title="No receipts yet" message="Recorded payments will appear here." />} />
    </Modal>
  );
}

export default function Fees() {
  const toast = useToast();
  const [month, setMonth] = useState(thisMonth());
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [paying, setPaying] = useState(null);
  const [receiptsFor, setReceiptsFor] = useState(null);
  const dq = useDebounced(q);
  const list = useAsync(() => api.get('/fees', { month, status, q: dq, page }), [month, status, dq, page]);

  const generate = async () => {
    setGenerating(true);
    try { toast.success((await api.post('/fees/generate', { month })).message); list.reload(); }
    catch (e) { toast.error(e.message); }
    finally { setGenerating(false); }
  };

  const remove = async () => {
    try { await api.del(`/fees/${deleting.id}`); toast.success('Fee record deleted.'); list.reload(); }
    catch (e) { toast.error(e.message); }
    setDeleting(null);
  };

  const columns = [
    { key: 'student_name', header: 'Student', primary: true, render: (r) => <><span>{r.student_name}</span><span className="block text-xs font-normal text-ink/60">{r.class_name} · Roll {r.roll_no}</span></> },
    { key: 'month', header: 'Month', render: (r) => formatMonth(r.month) },
    { key: 'amount', header: 'Amount', render: (r) => <><span>{money(r.amount)}</span><span className="block text-xs font-normal text-ink/60">{money(r.paid_amount)} paid · {money(r.balance_amount)} due</span></> },
    { key: 'status', header: 'Status', render: (r) => <><Badge tone={+r.balance_amount === 0 ? 'ok' : +r.paid_amount > 0 ? 'warn' : 'bad'}>{+r.balance_amount === 0 ? 'paid' : +r.paid_amount > 0 ? 'partial' : 'unpaid'}</Badge>{r.paid_on && <span className="ml-2 text-xs text-ink/60">{formatDate(r.paid_on)}</span>}</> },
  ];

  const sum = list.data?.summary;
  return (
    <>
      <PageHeader title="Fees" subtitle="Generate dues, record partial or full payments, and keep receipts.">
        <Button variant="accent" icon={Sparkles} loading={generating} onClick={generate}>Generate for {formatMonth(month)}</Button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Collected" value={money(sum?.collected)} icon={Check} tone="bg-ok-100 text-ok" />
        <Stat label="Pending" value={money(sum?.pending)} icon={Wallet} tone="bg-bad-100 text-bad" />
      </div>

      <Card pad={false}>
        <div className="grid gap-3 border-b border-chalk-200 p-4 sm:grid-cols-[1fr_auto_auto]">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search student or roll no" />
          <Input aria-label="Month" type="month" value={month} onChange={(e) => { setMonth(e.target.value || thisMonth()); setPage(1); }} wrapperClass="sm:w-44" />
          <Select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All statuses" options={[{ value: 'paid', label: 'Paid' }, { value: 'unpaid', label: 'Unpaid' }]} wrapperClass="sm:w-40" />
        </div>
        <DataTable columns={columns} rows={list.data?.data} meta={list.data?.meta} onPage={setPage} loading={list.loading} error={list.error} onRetry={list.reload}
          empty={<EmptyState icon={Wallet} title="No fee records" message={`Nothing for ${formatMonth(month)} with these filters. Use “Generate” to bill all active students.`} />}
          actions={(row) => (
            <>
              {+row.balance_amount > 0 && <Button size="sm" variant="primary" icon={Check} onClick={() => setPaying(row)}>Record payment</Button>}
              <Button size="icon" variant="ghost" aria-label="View receipts" title="View receipts" onClick={() => setReceiptsFor(row)}><ReceiptText size={16} /></Button>
              <Button size="icon" variant="ghost" aria-label="Delete" className="hover:!bg-bad-100 hover:!text-bad" onClick={() => setDeleting(row)}><Trash2 size={16} /></Button>
            </>
          )} />
      </Card>
      <ResourceForm open={!!paying} title="Record fee payment" initial={paying ? { amount: paying.balance_amount, paid_on: todayISO() } : {}} fields={[
        { name: 'amount', label: 'Payment amount (Rs)', type: 'number', required: true },
        { name: 'paid_on', label: 'Payment date', type: 'date', required: true },
        { name: 'payment_method', label: 'Method', type: 'select', required: true, options: [{ value: 'cash', label: 'Cash' }, { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'card', label: 'Card' }, { value: 'online', label: 'Online' }, { value: 'other', label: 'Other' }] },
        { name: 'reference', label: 'Reference / transaction ID', full: true },
      ]} onSubmit={async (values) => {
        await api.post(`/fees/${paying.id}/payments`, values);
        toast.success('Payment recorded and receipt created.');
        setPaying(null);
        list.reload();
      }} onClose={() => setPaying(null)} />
      {receiptsFor && <ReceiptHistory fee={receiptsFor} onClose={() => setReceiptsFor(null)} />}
      <ConfirmDialog open={!!deleting} title="Delete fee record?" message={`${deleting ? formatMonth(deleting.month) : ''} fee for ${deleting?.student_name} will be deleted.`} onConfirm={remove} onClose={() => setDeleting(null)} />
    </>
  );
}
