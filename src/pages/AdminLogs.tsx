import { useEffect, useState } from 'react';
import { supabase } from '../../supabase/supabaseClient';

type LogEntry = {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  target: string;
  message: string;
};

const PAGE_SIZE = 20;

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [sortAsc, setSortAsc] = useState(false); // new

  const fetchLogs = async (pageNumber: number, ascending: boolean) => {
    setLoading(true);
    const from = (pageNumber - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('timestamp', { ascending })
      .range(from, to);

    if (error) {
      console.error('Failed to load logs', error);
      setLogs([]);
    } else {
      setLogs(data as LogEntry[]);
      setHasNextPage(data.length >= PAGE_SIZE);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchLogs(page, sortAsc);
  }, [page, sortAsc]);

  const filteredLogs = logs.filter((log) => {
    return (
      (!filter || log.action === filter) &&
      (log.username.toLowerCase().includes(search.toLowerCase()) ||
        log.target.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const toggleSort = () => {
    setPage(1); // reset to page 1 when sort order changes
    setSortAsc(!sortAsc);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin Logs</h1>

      <div className="flex gap-4 mb-6">
        <select
          className="border px-2 py-1 rounded"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All Actions</option>
          <option value="added_drink">Added Drink</option>
          <option value="removed_drink">Removed Drink</option>
          <option value="created_party">Created Party</option>
          <option value="activated_party">Activated Party</option>
        </select>

        <input
          type="text"
          className="border px-3 py-1 rounded w-64"
          placeholder="Search username or target..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading logs...</p>
      ) : (
        <>
          <table className="w-full text-left border">
            <thead className="bg-gray-100">
              <tr>
                <th
                  className="p-2 border cursor-pointer select-none"
                  onClick={toggleSort}
                  title="Click to sort"
                >
                  Time {sortAsc ? '⬆️' : '⬇️'}
                </th>
                <th className="p-2 border">User</th>
                <th className="p-2 border">Action</th>
                <th className="p-2 border">Target</th>
                <th className="p-2 border">Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="p-2 border">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-2 border">{log.username}</td>
                  <td className="p-2 border">{log.action}</td>
                  <td className="p-2 border">{log.target}</td>
                  <td className="p-2 border">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between mt-4">
            <button
              className="bg-gray-200 px-4 py-2 rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Previous
            </button>
            <span className="text-sm mt-2">Page {page}</span>
            <button
              className="bg-gray-200 px-4 py-2 rounded disabled:opacity-50"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNextPage}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
