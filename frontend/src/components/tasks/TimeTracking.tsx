import React, { useState, useEffect } from "react";
import { Task, TimeEntry } from "@/types/tasks";
import { useTranslation } from "react-i18next";
import { HiClock, HiPencil, HiTrash, HiCheck, HiX } from "react-icons/hi";
import { Input } from "@/components/ui/input";
import ActionButton from "@/components/common/ActionButton";
import UserAvatar from "@/components/ui/avatars/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import ConfirmationModal from "../modals/ConfirmationModal";

interface TimeTrackingProps {
  task: Task;
  onLogTime: (timeEntry: Omit<TimeEntry, "id" | "createdAt" | "updatedAt">) => void;
  onUpdateTime: (timeEntryId: string, timeEntry: Partial<TimeEntry>) => void;
  onDeleteTime: (timeEntryId: string) => void;
}

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-2">
    <Icon size={20} className="text-[var(--primary)]" />
    <h2 className="text-md font-semibold text-[var(--foreground)]">{title}</h2>
  </div>
);

export default function TimeTracking({
  task,
  onLogTime,
  onUpdateTime,
  onDeleteTime,
}: TimeTrackingProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const { getCurrentUser, isAuthenticated } = useAuth();
  const currentUser = getCurrentUser();
  const isAuth = isAuthenticated();

  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const [newTimeLog, setNewTimeLog] = useState({
    timeSpent: 0,
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [editTimeLog, setEditTimeLog] = useState({
    timeSpent: 0,
    description: "",
    date: "",
  });

  const timeEntries = task.timeEntries || [];
  const totalTimeSpent = timeEntries.reduce((total, entry) => total + (entry.timeSpent || 0), 0);

  // Helper function to format time (minutes to hours and minutes)
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const handleAddTimeLog = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!newTimeLog.timeSpent || newTimeLog.timeSpent <= 0) {
      return;
    }

    if (!currentUser?.id) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert date to ISO string format for backend
      const dateISO = new Date(newTimeLog.date).toISOString();
      
      await onLogTime({
        description: newTimeLog.description,
        timeSpent: newTimeLog.timeSpent,
        date: dateISO,
        taskId: task.id,
        userId: currentUser.id,
      } as any);

      setNewTimeLog({
        timeSpent: 0,
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      setIsLoggingTime(false);
    } catch (error) {
      console.error("Failed to log time:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTimeLog = (entry: TimeEntry, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    // Convert date to YYYY-MM-DD format for date input
    const dateObj = new Date(entry.date);
    const formattedDate = dateObj.toISOString().split('T')[0];

    setEditingEntryId(entry.id);
    setEditTimeLog({
      timeSpent: entry.timeSpent,
      description: entry.description || "",
      date: formattedDate,
    });
  };

  const handleSaveEdit = async (entryId: string) => {
    if (!editTimeLog.timeSpent || editTimeLog.timeSpent <= 0) {
      return;
    }

    setIsEditSubmitting(true);
    try {
      // Convert date to ISO string format for backend
      const dateISO = new Date(editTimeLog.date).toISOString();
      
      await onUpdateTime(entryId, {
        timeSpent: editTimeLog.timeSpent,
        description: editTimeLog.description,
        date: dateISO,
      });

      setEditingEntryId(null);
      setEditTimeLog({
        timeSpent: 0,
        description: "",
        date: "",
      });
    } catch (error) {
      console.error("Failed to update time entry:", error);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditTimeLog({
      timeSpent: 0,
      description: "",
      date: "",
    });
  };

  const handleDeleteTimeLog = (entryId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEntryToDelete(entryId);
    setDeleteModalOpen(true);
  };

  const confirmDeleteTimeLog = async () => {
    if (!entryToDelete) return;
    try {
      await onDeleteTime(entryToDelete);
    } catch (error) {
      console.error("Failed to delete time entry:", error);
    } finally {
      setDeleteModalOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleCancelAddTimeLog = () => {
    setIsLoggingTime(false);
    setNewTimeLog({
      timeSpent: 0,
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <SectionHeader
          icon={HiClock}
          title={`${t("timeTracking.title", "Time Tracking")} (${formatTime(totalTimeSpent)} logged)`}
        />
        {isAuth && !isLoggingTime && (
          <ActionButton
            onClick={() => setIsLoggingTime(true)}
            variant="outline"
            showPlusIcon
            primary
            className="min-w-[193.56px]"
          >
            {t("timeTracking.logTime", "Log Time")}
          </ActionButton>
        )}
      </div>

      {/* Add Time Log Form */}
      {isLoggingTime && (
        <form
          onSubmit={handleAddTimeLog}
          className="space-y-3 p-4 bg-[var(--muted)]/30 rounded-lg border border-[var(--border)]"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
                {t("timeTracking.timeSpent", "Time Spent (minutes)")} *
              </label>
              <Input
                type="number"
                value={newTimeLog.timeSpent || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewTimeLog((prev) => ({ ...prev, timeSpent: parseInt(e.target.value) || 0 }))
                }
                placeholder="60"
                min="0"
                className="h-9 border-input bg-background text-[var(--foreground)]"
                autoFocus
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
                {t("timeTracking.date", "Date")} *
              </label>
              <Input
                type="date"
                value={newTimeLog.date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewTimeLog((prev) => ({ ...prev, date: e.target.value }))
                }
                className="h-9 border-input bg-background text-[var(--foreground)]"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
              {t("timeTracking.description", "Description")}
            </label>
            <Input
              type="text"
              value={newTimeLog.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewTimeLog((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder={t("timeTracking.descriptionPlaceholder", "What did you work on?")}
              className="h-9 border-input bg-background text-[var(--foreground)]"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center gap-2">
            <ActionButton
              type="submit"
              variant="outline"
              primary
              disabled={!newTimeLog.timeSpent || newTimeLog.timeSpent <= 0 || isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? t("common:loading", "Loading...") : t("timeTracking.logTime", "Log Time")}
            </ActionButton>
            <ActionButton
              type="button"
              onClick={handleCancelAddTimeLog}
              variant="outline"
              secondary
              className="min-w-[100px]"
              disabled={isSubmitting}
            >
              {t("common:cancel")}
            </ActionButton>
          </div>
        </form>
      )}

      {/* Time Entries List */}
      {Array.isArray(timeEntries) && timeEntries.length > 0 && (
        <div className="space-y-2">
          {timeEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 group p-3 rounded-lg bg-[var(--card)] hover:bg-[var(--accent)] border-none transition-colors shadow-sm hover:shadow-md"
            >
              {editingEntryId === entry.id ? (
                // Edit Mode
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
                        {t("timeTracking.timeSpent", "Time Spent (minutes)")}
                      </label>
                      <Input
                        type="number"
                        value={editTimeLog.timeSpent}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditTimeLog((prev) => ({ ...prev, timeSpent: parseInt(e.target.value) || 0 }))
                        }
                        min="0"
                        className="h-9 border-input bg-background text-[var(--foreground)]"
                        disabled={isEditSubmitting}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
                        {t("timeTracking.date", "Date")}
                      </label>
                      <Input
                        type="date"
                        value={editTimeLog.date}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditTimeLog((prev) => ({ ...prev, date: e.target.value }))
                        }
                        className="h-9 border-input bg-background text-[var(--foreground)]"
                        disabled={isEditSubmitting}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
                      {t("timeTracking.description", "Description")}
                    </label>
                    <Input
                      type="text"
                      value={editTimeLog.description}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditTimeLog((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder={t("timeTracking.descriptionPlaceholder", "What did you work on?")}
                      className="h-9 border-input bg-background text-[var(--foreground)]"
                      disabled={isEditSubmitting}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <ActionButton
                      onClick={() => handleSaveEdit(entry.id)}
                      variant="outline"
                      primary
                      className="h-8 px-3 text-sm"
                      disabled={isEditSubmitting}
                    >
                      {isEditSubmitting ? t("common:loading", "Loading...") : t("common:save")}
                    </ActionButton>
                    <ActionButton
                      onClick={handleCancelEdit}
                      variant="outline"
                      secondary
                      className="h-8 px-3 text-sm"
                      disabled={isEditSubmitting}
                    >
                      {t("common:cancel")}
                    </ActionButton>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex-shrink-0 pt-1">
                    <UserAvatar user={entry.user} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[var(--primary)]">
                        {formatTime(entry.timeSpent)}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        on {formatDate(entry.date)}
                      </span>
                    </div>
                    {entry.description && (
                      <p className="text-sm text-[var(--foreground)] break-words">
                        {entry.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--muted-foreground)]">
                        by {entry.user.firstName} {entry.user.lastName}
                      </span>
                    </div>
                  </div>
                  {isAuth && currentUser?.id && (entry.userId === currentUser.id || entry.user?.id === currentUser.id) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleEditTimeLog(entry, e)}
                        className="p-1.5 rounded hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                        title={t("common:edit")}
                      >
                        <HiPencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTimeLog(entry.id, e)}
                        className="p-1.5 rounded hover:bg-[var(--destructive)]/10 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
                        title={t("common:delete")}
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!Array.isArray(timeEntries) || timeEntries.length === 0 ? (
        <div className="text-center py-8 bg-[var(--muted)]/30 rounded-lg border border-[var(--border)]">
          <HiClock className="w-8 h-8 mx-auto mb-3 text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--foreground)] mb-2">
            {t("timeTracking.noEntries", "No time entries yet")}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {t("timeTracking.noEntriesDescription", "Track time spent on this task to see entries here")}
          </p>
        </div>
      ) : null}

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteTimeLog}
        title={t("timeTracking.deleteTitle", "Delete Time Entry")}
        message={t("timeTracking.deleteWarning", "Are you sure you want to delete this time entry? This action cannot be undone.")}
        confirmText={t("common:delete", "Delete")}
        cancelText={t("common:cancel", "Cancel")}
        type="danger"
      />
    </div>
  );
}
