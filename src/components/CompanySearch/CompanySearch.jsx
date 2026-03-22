import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CompanySearch.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const CompanySearch = () => {
    const navigate = useNavigate();

    
    const [allCompanies, setAllCompanies] = useState([]); // Stores the full list fetched from backend
    const [filteredCompanies, setFilteredCompanies] = useState([]); // Stores the list filtered by typing
    const [inputVal, setInputVal] = useState('');  // Stores what the user typed
    const [loading, setLoading] = useState(true);

    const searchContainerRef = useRef(null);

    // 1. Fetch data when component loads
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                //console.log("Fetching from:", `${BACKEND_URL}/stocks/get_company_list/`); // DEBUG LOG 1
                const response = await fetch(`${BACKEND_URL}/api/companies`);
                const data = await response.json();
                console.log("Data received from backend:", data); // DEBUG LOG 2
                if (response.ok) {
                    setAllCompanies(data.data);
                } else {
                    console.error("Failed to fetch companies:", data.message);
                }
            } catch (error) {
                console.error("Error connecting to backend:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    // 2. Handle user typing
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputVal(value);

        if (value.length > 0) {
            const filtered = allCompanies.filter((company) =>
                company.name.toLowerCase().includes(value.toLowerCase()) ||
                company.symbol.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredCompanies(filtered);
        } else {
            setFilteredCompanies([]);
        }
    };

    // 3. Handle clicking a table row
    const handleSelectCompany = (companySymbol) => {
        navigate(`/stocks/${companySymbol}`); // Navigate to dashboard
    };



    const displayedCompanies = inputVal ? filteredCompanies : allCompanies;

    return (
        <div className={styles.searchContainer} ref={searchContainerRef}>
            <div className={styles.inputGroup}>
                <input
                    type="text"
                    placeholder={loading ? "Loading data..." : "Search e.g., Reliance, TCS..."}
                    value={inputVal} 
                    onChange={handleInputChange}
                    className={styles.searchInput}
                    disabled={loading}
                />
                <button className={styles.analyzeButton}>
                    Search
                </button>
            </div>

            {!loading && (
                <div className={styles.tableWrapper}>
                    <table className={styles.companyTable}>
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Company Name</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedCompanies.length > 0 ? (
                                displayedCompanies.map((company) => (
                                    <tr
                                        key={company.symbol}
                                        className={styles.tableRow}
                                        onClick={() => handleSelectCompany(company.symbol)}
                                    >
                                        <td className={styles.companySymbol}>{company.symbol}</td>
                                        <td className={styles.companyName}>{company.company_name}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" className={styles.noResults}>No results found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CompanySearch;