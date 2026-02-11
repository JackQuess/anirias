import React, { useState, useCallback, useEffect } from 'react';
import { automationClient, type AutomationJob } from '@/lib/automationClient';
import {
  ActionsBar,
  JobsTable,
  JobDrawer,
  LiveLogs,
  PausedResolver,
  AddAnimeModal,
  ManualImportModal,
} from '@/components/admin/automation';

export default function AdminAutomation() {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<AutomationJob | null>(null);
  const [addAnimeOpen, setAddAnimeOpen] = useState(false);
  const [manualImportOpen, setManualImportOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const data = await automationClient.listJobs({ limit: 100 });
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const id = setInterval(fetchJobs, 5000);
    return () => clearInterval(id);
  }, [fetchJobs]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
          <span className="text-brand-red">Automation</span>
        </h1>
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">
          Job yönetimi, canlı loglar, paused resolver
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionsBar
          onRefresh={fetchJobs}
          onAddAnime={() => setAddAnimeOpen(true)}
          onManualImport={() => setManualImportOpen(true)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <JobsTable
            jobs={jobs}
            loading={jobsLoading}
            selectedId={selectedJob?.id ?? null}
            onSelect={setSelectedJob}
          />
        </div>
        <div>
          <PausedResolver onResolved={fetchJobs} />
        </div>
      </div>

      <LiveLogs jobId={selectedJob?.id ?? null} />

      <JobDrawer
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        job={selectedJob}
        onRefresh={fetchJobs}
      />

      <AddAnimeModal open={addAnimeOpen} onClose={() => setAddAnimeOpen(false)} onSuccess={fetchJobs} />
      <ManualImportModal open={manualImportOpen} onClose={() => setManualImportOpen(false)} onSuccess={fetchJobs} />
    </div>
  );
}
