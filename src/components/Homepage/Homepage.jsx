import React from 'react';
import styles from './Homepage.module.css';
import StockMarketIcon from '../../assets/StockMarketIcon.png';
import HeroSection from '../../assets/HeroSection.png';
import CompanySearch from '../CompanySearch/CompanySearch';

const Homepage = () => {
  return (
    <div className={styles.container}>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          {/* Left: The Image */}
          <div className={styles.logoLeft}>
             <img src={StockMarketIcon} alt="Stock Market Icon" className={styles.logoImage} />
          </div>
          {/* Center: The Text */}
          <div className={styles.logoCenter}>
             <span className={styles.logoText}>ArthNeeti</span>
          </div>
          {/* Right: Empty div for balancing the center alignment */}
          <div className={styles.logoRight}></div>
        </div>
      </header>

      {/* Top Section: Hero */}
      <section className={styles.heroSection}>
        <div className={styles.imagePlaceholder}>
          <img src={HeroSection} alt="Hero Image" className={styles.heroImage} />
        </div>
        <div className={styles.heroText}>
          <h1>Master the Market with Advanced Analytics.</h1>
        </div>
      </section>

      {/* Middle Section: Features */}
      <section className={styles.featuresSection}>
        <div className={styles.featureBox}>
          <h3>⏱️ Real Time Data</h3>
          <p>Real-time data and live market reactions.</p>
        </div>
        <div className={styles.featureBox}>
          <h3>📈 Powerful Charting</h3>
          <p>Intuitive powerful charts for market analysis.</p>
        </div>
        <div className={styles.featureBox}>
          <h3>🧠 Expert Insights</h3>
          <p>Expert insights that analyze market trends.</p>
        </div>
      </section>

      {/* Bottom Section: Search Area */}
      <section className={styles.searchSection}>
        <h2>Select a company to begin</h2>
        <CompanySearch/>
      </section>

    </div>
  );
};

export default Homepage;