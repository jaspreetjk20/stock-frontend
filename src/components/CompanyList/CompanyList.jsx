import { useState, useEffect } from 'react';
import {useNavigate} from 'react-router-dom';
import styles from './CompanyList.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const CompanyList = () => {

    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${BACKEND_URL}/stocks/get_company_list/`);
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch company list');
                }
                setCompanies(data.companies);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    const handleCompanyClick = (symbol) => {
       navigate(`/stocks/${symbol}`); 
    };

    if (loading) return <p>Loading companies...</p>;
    if (error) return <p>Error : {error}</p>;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Select a Company</h1>
            <ul className={styles.list}>
                {companies.map((company) => (
                    <li
                        key={company.company_symbol}
                        className={styles.listItem}
                        onClick={() => handleCompanyClick(company.symbol)}
                    >
                        <span className={styles.symbol}>{company.symbol}</span>
                        <span className={styles.name}>{company.company_name}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CompanyList;