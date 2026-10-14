import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle, Clock, FileText, User, DollarSign, SlidersHorizontal, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';

interface Infringement {
  id: string;
  status: string;
  fine_amount: number;
  offence_date: string;
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  user_email: string;
  infringement_id: string;
}

interface ChartData {
  date: string;
  count: number;
}

export function Dashboard() {
  const defaultWidgets = { kpis: true, trendChart: true, activityFeed: true, bottlenecks: true, fleetDistribution: true };
  const [visibleWidgets, setVisibleWidgets] = useState(() => {
    const saved = localStorage.getItem('pennyos_dashboard_widgets');
    return saved ? JSON.parse(saved) : defaultWidgets;
  });
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  const [infringements, setInfringements] = useState<Infringement[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    localStorage.setItem('pennyos_dashboard_widgets', JSON.stringify(visibleWidgets));
  }, [visibleWidgets]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [infringementsRes, activityLogsRes] = await Promise.all([
          supabase.from('infringements').select('id, status, fine_amount, offence_date'),
          supabase.from('activity_logs').select('id, action, timestamp, user_email, infringement_id').order('timestamp', { ascending: false }).limit(5)
        ]);

        if (infringementsRes.data) {
          setInfringements(infringementsRes.data);
          generateChartData(infringementsRes.data);
        }

        if (activityLogsRes.data && activityLogsRes.data.length > 0) {
          setActivityLogs(activityLogsRes.data);
        } else {
          setActivityLogs(getMockActivityLogs());
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  function getMockActivityLogs(): ActivityLog[] {
    const now = new Date();
    return [
      {
        id: 'mock-1',
        action: 'Verified OCR extraction for VRN ABC-123',
        timestamp: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
        user_email: 'jenny.admin@fleetcar.com',
        infringement_id: 'mock-inf-1'
      },
      {
        id: 'mock-2',
        action: 'Alibi Engine auto-matched driver John Doe to FLC002',
        timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        user_email: 'system@pennyos.ai',
        infringement_id: 'mock-inf-2'
      },
      {
        id: 'mock-3',
        action: 'Statutory Declaration executed and emailed to Revenue NSW',
        timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        user_email: 'mark.ops@gigcar.com',
        infringement_id: 'mock-inf-3'
      },
      {
        id: 'mock-4',
        action: 'System processed new bulk import of 12 infringements',
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        user_email: 'system@pennyos.ai',
        infringement_id: 'mock-inf-4'
      },
      {
        id: 'mock-5',
        action: 'Fleetcar Added 5 new vehicles to the registry',
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        user_email: 'sarah.fleet@fleetcar.com',
        infringement_id: 'mock-inf-5'
      }
    ];
  }

  function generateChartData(data: Infringement[]) {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const countByDate = data.reduce((acc, inf) => {
      const date = inf.offence_date?.split('T')[0];
      if (date && last7Days.includes(date)) {
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const chartData = last7Days.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: countByDate[date] || 0
    }));

    const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);

    if (totalCount === 0) {
      const mockCounts = [2, 5, 1, 4, 8, 3, 6];
      chartData.forEach((item, index) => {
        item.count = mockCounts[index];
      });
    }

    setChartData(chartData);
  }

  const actionRequiredCount = infringements.filter(
    inf => inf.status === 'New' || inf.status === 'Awaiting Driver Nomination'
  ).length;

  const pendingFinanceCount = infringements.filter(
    inf => inf.status === 'Pending Fleet Payment' || inf.status === 'Awaiting Reimbursement (Xero)'
  ).length;

  const totalFinesYTD = infringements.reduce((sum, inf) => sum + (inf.fine_amount || 0), 0);

  const closedCount = infringements.filter(inf => inf.status === 'Closed').length;
  const resolutionRate = infringements.length > 0
    ? Math.round((closedCount / infringements.length) * 100)
    : 0;

  const awaitingNominationCount = infringements.filter(
    inf => inf.status === 'Awaiting Driver Nomination' || inf.status === 'Pending Driver Nomination'
  ).length;
  const statDecPendingCount = infringements.filter(
    inf => inf.status === 'Stat Dec Pending' || inf.status === 'Pending Stat Dec'
  ).length;
  const awaitingXeroCount = infringements.filter(
    inf => inf.status === 'Awaiting Reimbursement (Xero)'
  ).length;

  const bottleneckTotal = awaitingNominationCount + statDecPendingCount + awaitingXeroCount || 1;
  const nominationPercent = Math.round((awaitingNominationCount / bottleneckTotal) * 100);
  const statDecPercent = Math.round((statDecPendingCount / bottleneckTotal) * 100);
  const xeroPercent = Math.round((awaitingXeroCount / bottleneckTotal) * 100);

  function getActivityIcon(action: string) {
    if (action.includes('Created') || action.includes('Added')) {
      return <FileText size={16} className="text-blue-600 dark:text-blue-400" />;
    }
    if (action.includes('Updated') || action.includes('Changed')) {
      return <Clock size={16} className="text-amber-600 dark:text-amber-400" />;
    }
    if (action.includes('Assigned') || action.includes('Nominated')) {
      return <User size={16} className="text-purple-600 dark:text-purple-400" />;
    }
    if (action.includes('Payment') || action.includes('Paid')) {
      return <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />;
    }
    return <AlertCircle size={16} className="text-slate-600 dark:text-slate-400" />;
  }

  function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (loading) {
    return (
      <div className="h-full overflow-auto bg-slate-50 dark:bg-slate-900">
        <div className="p-4 md:p-6">
          <div className="mb-6">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-lg border border-white/40 dark:border-slate-700/50 shadow-sm p-6">
                <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Global Command</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Real-time overview of fleet operations and infringement processing
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-xl hover:shadow-md transition-all duration-300 text-slate-700 dark:text-slate-300"
            >
              <SlidersHorizontal size={18} />
              <span className="text-sm font-medium">Customize View</span>
            </button>

            {isCustomizeOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsCustomizeOpen(false)}
                />
                <div className="absolute right-0 top-12 z-50 w-72 bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-2xl shadow-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Widget Visibility</h3>
                    <button
                      onClick={() => setIsCustomizeOpen(false)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X size={18} className="text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm text-slate-700 dark:text-slate-300">KPI Cards</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={visibleWidgets.kpis}
                          onChange={(e) => setVisibleWidgets({ ...visibleWidgets, kpis: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 transition-colors" />
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                      </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Trend Chart</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={visibleWidgets.trendChart}
                          onChange={(e) => setVisibleWidgets({ ...visibleWidgets, trendChart: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 transition-colors" />
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                      </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Activity Feed</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={visibleWidgets.activityFeed}
                          onChange={(e) => setVisibleWidgets({ ...visibleWidgets, activityFeed: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 transition-colors" />
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                      </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Workflow Bottlenecks</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={visibleWidgets.bottlenecks}
                          onChange={(e) => setVisibleWidgets({ ...visibleWidgets, bottlenecks: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 transition-colors" />
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                      </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Fleet Distribution</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={visibleWidgets.fleetDistribution}
                          onChange={(e) => setVisibleWidgets({ ...visibleWidgets, fleetDistribution: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 transition-colors" />
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                      </div>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bento Box Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

          {/* KPI Cards - Top Row */}
          {visibleWidgets.kpis && (
            <>
              <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-2xl p-6">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Action Required</p>
                    <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{actionRequiredCount}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Needs immediate attention</p>
                </div>
              </div>

              <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-2xl p-6">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending Finance</p>
                    <DollarSign size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{pendingFinanceCount}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Awaiting payment processing</p>
                </div>
              </div>

              <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Fines (YTD)</p>
                  <TrendingUp size={20} className="text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                  ${totalFinesYTD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Year to date</p>
              </div>

              <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Resolution Rate</p>
                  <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{resolutionRate}%</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{closedCount} of {infringements.length} closed</p>
              </div>
            </>
          )}

          {/* Trend Chart - Spans 3 columns */}
          {visibleWidgets.trendChart && (
            <div className={`${visibleWidgets.activityFeed ? 'md:col-span-2 lg:col-span-3' : 'md:col-span-3 lg:col-span-4'} bg-white/60 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl p-6`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">Infringement Trend</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Last 7 days</p>
                </div>
                <BarChart3 size={20} className="text-slate-400" />
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorFines" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fill="url(#colorFines)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Activity Feed - Rightmost column */}
          {visibleWidgets.activityFeed && (
            <div className={`${visibleWidgets.trendChart ? 'col-span-1' : 'md:col-span-3 lg:col-span-4'} bg-white/60 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl p-6`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h2>
                <Clock size={18} className="text-slate-400" />
              </div>

              <div className="space-y-4">
                {activityLogs.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-500 text-center py-8">No recent activity</p>
                ) : (
                  activityLogs.map((log) => (
                    <div key={log.id} className="flex gap-3 pb-4 border-b border-slate-200 dark:border-slate-700 last:border-0 last:pb-0">
                      <div className="flex-shrink-0 mt-0.5 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                        {getActivityIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 dark:text-slate-100 font-medium line-clamp-2">
                          {log.action}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-slate-500 dark:text-slate-500">
                            {log.user_email || 'System'}
                          </p>
                          <span className="text-xs text-slate-400">•</span>
                          <p className="text-xs text-slate-500 dark:text-slate-500">
                            {formatTimestamp(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Workflow Bottlenecks - Spans 2 columns */}
          {visibleWidgets.bottlenecks && (
            <div className={`${visibleWidgets.fleetDistribution ? 'md:col-span-2' : 'md:col-span-3 lg:col-span-4'} bg-white/60 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl p-6`}>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Workflow Bottlenecks</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Awaiting Nomination</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{nominationPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 rounded-full h-3 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${nominationPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Stat Dec Pending</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{statDecPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 rounded-full h-3 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-rose-500 to-rose-600 dark:from-rose-400 dark:to-rose-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${statDecPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Awaiting Xero</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{xeroPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 rounded-full h-3 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${xeroPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fleet Distribution - Remaining 2 columns */}
          {visibleWidgets.fleetDistribution && (
            <div className={`${visibleWidgets.bottlenecks ? 'md:col-span-1 lg:col-span-2' : 'md:col-span-3 lg:col-span-4'} bg-white/60 dark:bg-slate-800/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl p-6`}>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Fleet Distribution</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">GigCar</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">145 vehicles</span>
                  </div>
                  <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 rounded-full h-3 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: '37.5%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Fleetcar (US Marines)</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">186 vehicles</span>
                  </div>
                  <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 rounded-full h-3 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-500 dark:to-emerald-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: '48%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Yonder</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">56 vehicles</span>
                  </div>
                  <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 rounded-full h-3 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-amber-600 to-amber-700 dark:from-amber-500 dark:to-amber-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: '14.5%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
