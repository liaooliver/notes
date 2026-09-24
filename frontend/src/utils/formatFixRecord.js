export function formatFixRecord(date, title) {
  if (!date || !title) {
    throw new Error('date and title are required')
  }
  return `${date} - ${title}`
}
