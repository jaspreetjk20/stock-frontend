import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './components/Homepage/Homepage';
//  import StockDashboard from './components/StockDashboard';
import styles from './App.module.css';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path ="/" element={<Homepage/>}/>
            </Routes>
        </BrowserRouter>
    );
};

export default App;