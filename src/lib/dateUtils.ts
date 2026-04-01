export function parseDateString(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  if (dateStr.includes("/")) {
    const parts = dateStr.split(" ");
    const dateParts = parts[0].split("/");
    if (dateParts.length === 3) {
      const [day, month, year] = dateParts;
      const timePart = parts[1] || "00:00:00";
      return new Date(`${year}-${month}-${day}T${timePart}`);
    }
  }
  return null;
}

export function parseSheetDate(val: any): string | null {
  if (!val) return null;
  const d = parseDateString(String(val));
  return d ? d.toISOString() : null;
}

export function getIstDateString(): string {
  // Returns ISO date string adjusted for IST context (though natively handled by server, 
  // sometimes needed for client-side comparison)
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
