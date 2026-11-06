export const normalizeComment = (comment, fallback, leadId) => {
  if (comment && comment.comment) {
    return comment;
  }
  const timestamp = new Date().toISOString();
  return {
    id: Date.now(),
    lead_id: leadId,
    comment: fallback.comment,
    comment_date: fallback.comment_date || timestamp,
    scheduled_date: fallback.scheduled_date,
    scheduled_status: fallback.scheduled_status,
    created_at: timestamp,
    updated_at: timestamp,
  };
};

