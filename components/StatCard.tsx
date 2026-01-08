
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, icon, color = "red" }) => {
  const colorMap: Record<string, string> = {
    red: "bg-red-600 text-white shadow-red-100",
    green: "bg-emerald-500 text-white shadow-emerald-100",
    amber: "bg-amber-500 text-white shadow-amber-100",
    slate: "bg-slate-900 text-white shadow-slate-200",
  };

  const textColorMap: Record<string, string> = {
    red: "text-red-600",
    green: "text-emerald-600",
    amber: "text-amber-600",
    slate: "text-slate-900",
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-50 border border-slate-100 flex flex-col items-center text-center transition-all hover:-translate-y-1 hover:shadow-2xl">
      <div className={`p-4 rounded-2xl mb-6 shadow-2xl ${colorMap[color] || colorMap.red}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
        <h3 className={`text-3xl font-black italic tracking-tighter ${textColorMap[color] || textColorMap.red} mb-2`}>{value}</h3>
        {subValue && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                {subValue}
            </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
