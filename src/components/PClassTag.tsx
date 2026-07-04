interface PClassTagProps {
  cls: string;
  staffName?: string;
}

export default function PClassTag({ cls, staffName }: PClassTagProps) {
  if (cls === 'reimbursement') {
    const name = staffName ? ` · ${staffName}` : '';
    return <span className="pclass-tag pclass-tag-reimb">💼 Reimb{name}</span>;
  }
  return <span className="pclass-tag pclass-tag-bill">🧾 Bill</span>;
}
