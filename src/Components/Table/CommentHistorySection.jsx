import React from "react";
import Modal from "../../Pages/details-modal/Modal";
import { Calendar as CalendarIcon, Tag } from "lucide-react";

const CommentHistorySection = ({
  sortedComments = [],
  onAddCommentClick,
  isAddModalOpen,
  onCloseAddModal,
  renderForm,
  formatDateTime,
  formatScheduledDateTime,
  commentCount,
}) => {
  const totalComments = commentCount ?? sortedComments.length;
  return (
    <>
      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-100 bg-gradient-to-b from-white via-white to-gray-50 shadow-sm shadow-gray-100/80">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                Comment History
              </p>
              <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-semibold text-gray-600">
                  {totalComments} {totalComments === 1 ? "comment" : "comments"}
                </span>
            </div>
            <button
              type="button"
              onClick={onAddCommentClick}
        className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm shadow-brand/30 transition hover:bg-brand-hover cursor-pointer"
            >
              Add Comment
            </button>
          </div>

          <div className="px-5 py-4">
            {sortedComments.length ? (
              <div className="relative min-h-[200px]">
                <div className="absolute left-5.75 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-brand/40 to-transparent" />
                <div className="space-y-4">
                  {sortedComments.map((comment, idx) => (
                    <div
                      key={comment.id || comment.created_at || idx}
                      className="relative pl-10"
                    >
                      <div
                        className={`absolute left-[18px] top-3 h-3 w-3 rounded-full border-2 z-10 ${
                          idx === 0
                            ? "border-brand bg-brand shadow-sm shadow-brand/40"
                            : "border-gray-300 bg-white"
                        }`}
                      />
                      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <p className="text-xs font-semibold tracking-wide text-gray-400">
                            {`${comment?.emp?.f_name || ""} ${comment?.emp?.l_name || ""} - ${comment?.emp_id || ""}`}
                          </p>
                          <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-link">
                            {formatDateTime(
                              comment.comment_date || comment.created_at
                            )}
                          </span>
                        </div>
                        <p className="text-base font-medium text-gray-900 whitespace-pre-wrap leading-relaxed mb-3">
                          {comment.comment}
                        </p>
                        {(comment.scheduled_date || comment.scheduled_status) && (
                          <div className="pt-2 border-t border-gray-100">
                            <div className="flex flex-wrap items-center gap-2">
                              {comment.scheduled_date && (
                                <div className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2.5 py-1.5 border border-gray-200">
                                  <CalendarIcon size={14} className="text-gray-500" />
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-500">Scheduled:</span>
                                    <span className="text-xs font-medium text-gray-700">
                                      {formatScheduledDateTime(comment.scheduled_date)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                <p className="text-sm text-gray-500">
                  No comments added yet. Be the first to add a note for this lead.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={onCloseAddModal}
        title="Add Comment"
        showTitle={true}
        size="small"
        zIndex={60}
      >
        {renderForm()}
      </Modal>
    </>
  );
};

export default CommentHistorySection;

