import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './components/Homepage/Homepage';
import CompanyDashboard from './components/CompanyDashboard/CompanyDashboard';
import styles from './App.module.css';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path ="/" element={<Homepage/>}/>
                <Route path="/stocks/:companySymbol" element={<CompanyDashboard />}/>
            </Routes>
        </BrowserRouter>
    );
};

export default App;