import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './StockDashboard.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const StockDashboard = () => {

    const { symbol } = useParams();
    const navigate = useNavigate();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [stockData, setStockData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFetchData = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                company_symbol: symbol,
                start_date: startDate,
                end_date: endDate,
            });

            console.log(`${BACKEND_URL}/stocks/get_stock_data/?${params}`);

            const response = await fetch(`${BACKEND_URL}/stocks/get_stock_data/?${params}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `Error ${response.status}: Failed to fetch stock data`);
            console.log(data);
            setStockData(data.data);
        } catch (err) {
            setError(err.message);
            setStockData([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>

            <button onClick={() => navigate('/')} className={styles.backButton}>
                ← Back to Companies
            </button>

            <h1 className={styles.title}>Stock Data: {symbol}</h1>

            {/* Date range form — only dates needed, symbol already in URL */}
            <form onSubmit={handleFetchData} className={styles.filterForm}>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className={styles.inputField}
                />
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className={styles.inputField}
                />
                <button type="submit" disabled={loading} className={styles.fetchButton}>
                    {loading ? 'Loading...' : 'Fetch Data'}
                </button>
            </form>

            {error && <p className={styles.errorState}>{error}</p>}

            {!error && !loading && stockData.length === 0 && (
                <p className={styles.emptyState}>
                    Select a date range and click Fetch Data.
                </p>
            )}

            {loading && <p className={styles.loadingState}>Fetching stock data...</p>}

            {!loading && stockData.length > 0 && (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Open</th>
                                <th>High</th>
                                <th>Low</th>
                                <th>Close</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stockData.map((row, index) => (
                                <tr key={index}>
                                    <td>{new Date(row.time).toLocaleString()}</td>
                                    <td>${row.open.toFixed(2)}</td>
                                    <td>${row.high.toFixed(2)}</td>
                                    <td>${row.low.toFixed(2)}</td>
                                    <td>${row.close.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StockDashboard;