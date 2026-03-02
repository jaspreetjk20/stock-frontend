import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CompanySearch.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const CompanySearch = () => {
    const navigate = useNavigate();

    
    const [allCompanies, setAllCompanies] = useState([]); // Stores the full list fetched from backend
    const [filteredCompanies, setFilteredCompanies] = useState([]); // Stores the list filtered by typing
    const [inputVal, setInputVal] = useState('');  // Stores what the user typed
    const [showDropDown, setShowDropDown] = useState(false); // Toggles the dropdown visibility
    const [loading, setLoading] = useState(true);

    const searchContainerRef = useRef(null);

    // 1. Fetch data when component loads
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                console.log("Fetching from:", `${BACKEND_URL}/stocks/get_company_list/`); // DEBUG LOG 1
                const response = await fetch(`${BACKEND_URL}/stocks/get_company_list/`);
                const data = await response.json();
                console.log("Data received from backend:", data); // DEBUG LOG 2
                if (response.ok) {
                    setAllCompanies(data.companies);
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
            // Filter based on symbol or company name 
            const filtered = allCompanies.filter((company) =>
                company.company_name.toLowerCase().includes(value.toLowerCase()) ||
                company.symbol.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredCompanies(filtered);
            setShowDropDown(true);
        } else {
            setShowDropDown(false);
        }
    };

    // 3. Handle clicking a dropdown item
    const handleSelectCompany = (companySymbol) => {
        setShowDropDown(false);
        navigate(`/stocks/${companySymbol}`); // Navigate to dashboard
    };

    // 4. Handle clicking outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setShowDropDown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [searchContainerRef]);


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
                    onFocus={() => inputVal && filteredCompanies.length > 0 && setShowDropDown(true)}
                />
                <button className={styles.analyzeButton}>
                    Search
                </button>
            </div>

            
            {showDropDown && filteredCompanies.length > 0 && (
                <ul className={styles.dropdownList}>
                    {filteredCompanies.slice(0, 8).map((company) => ( // Limit to 8 results for neatness
                        <li
                            key={company.symbol}
                            className={styles.dropdownItem}
                            onClick={() => handleSelectCompany(company.symbol)}
                        >
                            <span className={styles.companySymbol}>{company.symbol}</span>
                            <span className={styles.companyName}>{company.company_name}</span>
                        </li>
                    ))}
                </ul>
            )}
            
            {showDropDown && filteredCompanies.length === 0 && inputVal && (
                <div className={styles.noResults}>No results found.</div>
            )}
        </div>
    );
};

export default CompanySearch;