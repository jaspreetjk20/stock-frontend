import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './CompanyDashboard.module.css';
import { io } from 'socket.io-client'; //Websocket feature import

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL; //Live server URL
const timePeriods = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'YTD'];

//Function to set the start and end date
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
            startDate.setDate(endDate.getDate() - 1); break; // Yesterday
    }

    // Format dates to YYYY-MM-DD 
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
                //Get dates
                const { start, end } = getDateRange(activePeriod);
                
                // 2. Fetch data from backend for the specified date range
                const url = `${BACKEND_URL}/stocks/get_stock_data?company_symbol=${companySymbol}&start_date=${start}&end_date=${end}`;
                console.log(`Fetching ${activePeriod} data from:`, url);

                const response = await fetch(url);
                const data = await response.json();

                if (response.ok && data.success) {
                    // Format the data for charts
                    const formattedData = data.data.map(item => { //Iterate over raw API data
                        const dateObj = new Date(item.time); //Convert string to date object
                        const cleanTime = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); //Format date as DD MM

                        return { //Return newly formatted data
                            ...item,
                            time: cleanTime,
                            open: Number(item.open),
                            high: Number(item.high),
                            low: Number(item.low),
                            close: Number(item.close)
                        };
                    });
                    
                    setChartData(formattedData); //update state with chart-ready data
                } else {
                    setError(data.message || "Failed to fetch stock data");
                    setChartData([]); // Clear chart if no data found
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
            fetchHistory(); //hit the API endpoint
        }
    }, [companySymbol, activePeriod]); 


    //Live data
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

        return () => { //disconnect when user leaves page/changes company
            socket.disconnect();
        };
    }, [companySymbol, loading]);

    // Show the latest data on the top in the table
    const latestData = chartData.length > 0 ? chartData[chartData.length - 1] : null;

    return (
        <div className={styles.dashboardContainer}>
            {/* Header Section */}
            <div className={styles.headerInfo}>
                <div className={styles.topRow}>
                    <h1 className={styles.stockName}>{companySymbol}</h1>
                    {latestData ? (
                        <h2 className={styles.currentPrice}>₹{latestData.close.toFixed(2)}</h2>
                    ) : (
                        <h2 className={styles.currentPrice}>--</h2>
                    )}
                </div>
                
                {latestData && (
                    <div className={styles.priceStats}>
                        <div className={styles.ohlc}>
                            <div>
                                <strong>Open</strong>
                                <span className={styles.value}>{latestData.open.toFixed(2)}</span>
                            </div>
                            <div>
                                <strong>High</strong>
                                <span className={styles.value}>{latestData.high.toFixed(2)}</span>
                            </div>
                            <div>
                                <strong>Low</strong>
                                <span className={styles.value}>{latestData.low.toFixed(2)}</span>
                            </div>
                            <div>
                                <strong>Close</strong>
                                <span className={styles.value}>{latestData.close.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Chart Section */}
            <div className={styles.chartWrapper}>
                {loading ? (
                    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <h3>Loading chart data...</h3>
                    </div>
                ) : error ? (
                    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red' }}>
                        <h3>{error}</h3>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                            <XAxis 
                                dataKey="time" 
                                tick={{ fontSize: 12, fill: '#94a3b8' }} 
                                stroke="rgba(148, 163, 184, 0.2)"
                            />
                            <YAxis 
                                domain={['auto', 'auto']} 
                                tick={{ fontSize: 12, fill: '#94a3b8' }}
                                stroke="rgba(148, 163, 184, 0.2)"
                            />
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                                    border: '1px solid rgba(148, 163, 184, 0.2)',
                                    borderRadius: '8px',
                                    color: '#e2e8f0'
                                }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="close" 
                                stroke="#3b82f6" 
                                strokeWidth={3} 
                                dot={{ fill: '#3b82f6', r: 4 }} 
                                activeDot={{ r: 6 }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Time Period Buttons */}
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

            {/* Real Data Table Section */}
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
                            {/* Reverse the array so newest dates appear at the top */}
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
                    <p>No historical data available for this time period.</p>
                )}
            </div>
        </div>
    );
};

export default CompanyDashboard;