import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './CompanyDashboard.module.css';
import { io } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // GitHub Flavored Markdown (supports tables)
import remarkMath from 'remark-math'; // Math syntax support
import rehypeKatex from 'rehype-katex'; // LaTeX rendering
import 'katex/dist/katex.min.css'; // KaTeX CSS for proper rendering

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL; 
const timePeriods = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'YTD'];

const getDateRange = (period) => {
    const endDate = new Date(); 
    const startDate = new Date();

    switch (period) {
        case '1W': startDate.setDate(endDate.getDate() - 7); break;
        case '1M': startDate.setMonth(endDate.getMonth() - 1); break;
        case '3M': startDate.setMonth(endDate.getMonth() - 3); break;
        case '6M': startDate.setMonth(endDate.getMonth() - 6); break;
        case '1Y': startDate.setFullYear(endDate.getFullYear() - 1); break;
        case '5Y': startDate.setFullYear(endDate.getFullYear() - 5); break;
        case 'YTD': startDate.setMonth(0, 1); break; 
        case '1D': 
        default: 
            startDate.setDate(endDate.getDate() - 1); break; 
    }

    return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
    };
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '12px',
                color: '#fff',
                fontSize: '13px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
            }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#60a5fa' }}>
                    {data.time}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                        <span style={{ color: '#94a3b8' }}>Open:</span>
                        <span style={{ fontWeight: '500' }}>₹{data.open.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                        <span style={{ color: '#94a3b8' }}>High:</span>
                        <span style={{ fontWeight: '500', color: '#22c55e' }}>₹{data.high.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                        <span style={{ color: '#94a3b8' }}>Low:</span>
                        <span style={{ fontWeight: '500', color: '#ef4444' }}>₹{data.low.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                        <span style={{ color: '#94a3b8' }}>Close:</span>
                        <span style={{ fontWeight: '500' }}>₹{data.close.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const CompanyDashboard = () => {
    const { companySymbol } = useParams();
    const [activePeriod, setActivePeriod] = useState('3M'); 
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    //AI Analysis States
    const [aiVerdict, setAiVerdict] = useState(null);
    const [aiReports, setAiReports] = useState(null);
    const [verdictLoading, setVerdictLoading] = useState(true);
    const [reportsLoading, setReportsLoading] = useState(false);
    const [expandedReports, setExpandedReports] = useState([]); // Track which reports are expanded

    // Toggle individual report expansion
    const toggleReport = (index) => {
        setExpandedReports(prev => 
            prev.includes(index) 
                ? prev.filter(i => i !== index) 
                : [...prev, index]
        );
    }; 

    // 1. Fetch Historical Chart Data
    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError(null); 

            try {
                const { start, end } = getDateRange(activePeriod);
                const url = `${BACKEND_URL}/api/historical-data/historical-data?company_symbol=${companySymbol}&start_date=${start}&end_date=${end}`;
                
                const response = await fetch(url);
                const result = await response.json();

                if (response.ok && result.success && result.data?.data?.candles) {
                    const rawCandles = result.data.data.candles;
                    const formattedData = rawCandles.map(item => {
                        const dateObj = new Date(item[0]);
                        const cleanTime = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

                        return {
                            time: cleanTime,
                            open: Number(item[1]),
                            high: Number(item[2]),
                            low: Number(item[3]),
                            close: Number(item[4]),
                            volume: Number(item[5])
                        };
                    }).sort((a, b) => new Date(a.time) - new Date(b.time));
                    
                    setChartData(formattedData);
                } else {
                    setError(result.message || "No data found for this period");
                    setChartData([]);
                }
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Server connection failed");
                setChartData([]);
            } finally {
                setLoading(false);
            }
        };

        if (companySymbol) fetchHistory();
    }, [companySymbol, activePeriod]); 

    //Fetch AI Verdict
    useEffect(() => {
        const fetchVerdict = async () => {
            setVerdictLoading(true);
            setAiReports(null); // Clear old reports for new stocks
            
            try {
                const response = await fetch(`${BACKEND_URL}/api/ai-verdict/decision/${companySymbol}`);
                const result = await response.json();
                
                if (response.ok && result.success) {
                    setAiVerdict(result.data);
                } else {
                    setAiVerdict(null);
                }
            } catch (error) {
                console.error("Failed to fetch AI verdict", error);
                setAiVerdict(null);
            } finally {
                setVerdictLoading(false);
            }
        };

        if (companySymbol) fetchVerdict();
    }, [companySymbol]);


    //Fetch Detailed Reports
    const handleViewReports = async () => {
        if (!aiVerdict?.analysis_id) return;

        // If already fetched, do nothing (reports are already visible below)
        if (aiReports) {
            return;
        }

        setReportsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/ai-verdict/report/${aiVerdict.analysis_id}`);
            const result = await response.json();
            
            if (response.ok && result.success) {
                setAiReports(result.data);
            }
        } catch (error) {
            console.error("Failed to fetch detailed reports", error);
        } finally {
            setReportsLoading(false);
        }
    };

    //WebSocket Live Data
    useEffect(() => {
        if(loading) return;
        
        const socket = io(WEBSOCKET_URL); 
        socket.emit('subscribe', companySymbol); 

        socket.on('live_data', (newTick) => { 
            setError(null);
            setChartData((prevData) => {
                const tickTime = new Date(newTick.time).toLocaleTimeString('en-GB', { 
                    hour: '2-digit', minute: '2-digit', second: '2-digit' 
                });
                const formattedTick = {
                    ...newTick,
                    time: tickTime
                };
                return [...prevData, formattedTick]; 
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [companySymbol, loading]);

    const latestData = chartData.length > 0 ? chartData[chartData.length - 1] : null;

    return (
        <div className={styles.dashboardContainer}>
            {/* Header Section */}
            <div className={styles.headerInfo}>
                <div className={styles.topRow}>
                    <h1 className={styles.stockName}>{companySymbol}</h1>
                    {latestData ? (
                        <div className={styles.priceVolume}>
                            <h2 className={styles.currentPrice}>₹{latestData.close.toFixed(2)}</h2>
                        </div>
                    ) : (
                        <h2 className={styles.currentPrice}>--</h2>
                    )}
                </div>
                
                {latestData && (
                    <div className={styles.priceStats}>
                        <div className={styles.ohlc}>
                            <div><strong>Open</strong><span className={styles.value}>{latestData.open.toFixed(2)}</span></div>
                            <div><strong>High</strong><span className={styles.value}>{latestData.high.toFixed(2)}</span></div>
                            <div><strong>Low</strong><span className={styles.value}>{latestData.low.toFixed(2)}</span></div>
                            <div><strong>Close</strong><span className={styles.value}>{latestData.close.toFixed(2)}</span></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Chart and AI Analysis Section */}
            <div className={styles.chartAnalysisContainer}>
                
                {/* Chart Section (Left) */}
                <div className={styles.chartSection}>
                    <div className={styles.chartWrapper}>
                        {loading ? (
                            <div className={styles.centerMessage}><h3>Loading chart data...</h3></div>
                        ) : error ? (
                            <div className={styles.centerMessage} style={{ color: 'red' }}><h3>{error}</h3></div>
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.8}/>
                                            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.1}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#94a3b8' }} orientation="right" axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} fill="url(#colorClose)" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className={styles.timePeriodContainer}>
                        {timePeriods.map((period) => (
                            <button
                                key={period}
                                className={`${styles.periodButton} ${activePeriod === period ? styles.active : ''}`}
                                onClick={() => setActivePeriod(period)}
                                disabled={loading} 
                            >
                                {period}
                            </button>
                        ))}
                    </div>
                </div>

                {/* AI Analysis Section*/}
                <div className={styles.aiAnalysisSection}>
                    <div className={styles.aiSidebarContainer}>
                        
                        {/*Verdict Card */}
                        <div className={styles.verdictTopBox}>
                            <h3 className={styles.aiAnalysisTitle}>Expert AI Verdict</h3>
                            
                            {verdictLoading ? (
                                <p style={{ color: '#94a3b8' }}>Analyzing latest market data...</p>
                            ) : aiVerdict ? (
                                <>
                                    <div className={styles.cardHeader}>
                                        <span className={styles.cardLabel}>Market Sentiment</span>
                                        <span className={`${styles.verdictBadge} ${
                                            aiVerdict.decision === 'BUY' ? styles.buy : 
                                            aiVerdict.decision === 'SELL' ? styles.sell : styles.hold
                                        }`}>
                                            {aiVerdict.decision}
                                        </span>
                                    </div>
                                    
                                    <p className={styles.verdictDate}>
                                        Generated on: {new Date(aiVerdict.trade_date).toLocaleDateString('en-GB')}
                                    </p>

                                    <button 
                                        onClick={handleViewReports} 
                                        className={styles.viewReportBtn}
                                        disabled={reportsLoading}
                                    >
                                        {reportsLoading ? "Loading Reports..." : "View Detailed Report ↓"}
                                    </button>
                                </>
                            ) : (
                                <p style={{ color: '#94a3b8' }}>No AI analysis available for this stock yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Reports Section - Below Chart */}
            {aiReports && (
                <div className={styles.detailedReportsContainer}>
                    <h3 className={styles.reportsMainTitle}>Detailed AI Analysis Reports</h3>
                    <div className={styles.reportsAccordion}>
                        {aiReports.map((agent, index) => (
                            <div key={index} className={styles.accordionItem}>
                                <button 
                                    className={`${styles.accordionHeader} ${expandedReports.includes(index) ? styles.expanded : ''}`}
                                    onClick={() => toggleReport(index)}
                                >
                                    <div className={styles.accordionHeaderContent}>
                                        <h5 className={styles.agentName}>{agent.agent_name.toUpperCase()} ANALYSIS</h5>
                                        <span className={styles.accordionIcon}>
                                            {expandedReports.includes(index) ? '−' : '+'}
                                        </span>
                                    </div>
                                </button>
                                
                                {expandedReports.includes(index) && (
                                    <div className={styles.accordionContent}>
                                        <div className={styles.markdownContent}>
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                            >
                                                {agent.report}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}


        </div>
    );
};

export default CompanyDashboard;