import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './CompanyDashboard.module.css';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL; //Live server URL
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

const CompanyDashboard = () => {
    const { companySymbol } = useParams();
    const [activePeriod, setActivePeriod] = useState('3M'); 
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError(null); 

            try {
                const { start, end } = getDateRange(activePeriod);
                
                // CORRECTED URL: using companySymbol from useParams
                const url = `${BACKEND_URL}/api/historical-data/historical-data?company_symbol=${companySymbol}&start_date=${start}&end_date=${end}`;
                console.log(`Fetching ${activePeriod} data from:`, url);

                const response = await fetch(url);
                const result = await response.json();

                // CORRECTED DATA DRILLING: result.data.data.candles
                if (response.ok && result.success && result.data?.data?.candles) {
                    const rawCandles = result.data.data.candles;

                    // Upstox V3 returns arrays: [timestamp, open, high, low, close, volume, ...]
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

        if (companySymbol) {
            fetchHistory();
        }
    }, [companySymbol, activePeriod]); 

    useEffect(() => {

        if(loading) return;//Don't connect to websocket until historical data is finished loading
        
        const socket = io(WEBSOCKET_URL); //Connect to the websocket server

        socket.emit('subscribe', companySymbol); //Tell the server which company 

        socket.on('live_data', (newTick) => { //Dummy ticks from server

            setError(null);
            setChartData((prevData) => {
                const tickTime = new Date(newTick.time).toLocaleTimeString('en-GB', { 
                    hour: '2-digit', minute: '2-digit', second: '2-digit' 
                });
                const formattedTick = {
                    ...newTick,
                    time: tickTime
                };
                return [...prevData, formattedTick]; //Attach the new tick
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [companySymbol, loading]);

    const latestData = chartData.length > 0 ? chartData[chartData.length - 1] : null;

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.headerInfo}>
                <div className={styles.topRow}>
                    <h1 className={styles.stockName}>{companySymbol}</h1>
                    {latestData ? (
                        <div className={styles.priceVolume}>
                            <h2 className={styles.currentPrice}>₹{latestData.close.toFixed(2)}</h2>
                            {latestData.volume != null && (
                                <span className={styles.volumeBadge}>Vol: {Number(latestData.volume).toLocaleString()}</span>
                            )}
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

            <div className={styles.chartAnalysisContainer}>
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
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }} />
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

                <div className={styles.aiAnalysisSection}>
                    <div className={styles.aiAnalysisWrapper}>
                        <h3 className={styles.aiAnalysisTitle}>AI Analysis</h3>
                        <div className={styles.aiAnalysisContent}>
                            <div className={styles.analysisCard}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.cardLabel}>Market Sentiment</span>
                                    <span className={styles.sentimentBadge}>Bullish</span>
                                </div>
                                <p className={styles.cardText}>Analysis based on historical patterns suggests upward momentum.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <h3 className={styles.tableTitle}>Price History</h3>
                {chartData.length > 0 ? (
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Open (₹)</th>
                                <th>High (₹)</th>
                                <th>Low (₹)</th>
                                <th>Close (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {chartData.slice().reverse().map((row, index) => (
                                <tr key={index}>
                                    <td>{row.time}</td>
                                    <td>{row.open.toFixed(2)}</td>
                                    <td>{row.high.toFixed(2)}</td>
                                    <td>{row.low.toFixed(2)}</td>
                                    <td>{row.close.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No historical data available.</p>
                )}
            </div>
        </div>
    );
};

export default CompanyDashboard;