import { useState } from 'react';
import AddDesign from '../components/AddDesignSection';
import Pending from '../components/PendingSection';
import Completed from '../components/CompletedSection';

export default function Dashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', paddingBottom: '3rem' }}>
      <section className="dashboard-section fancy-card">
        <h2 className="section-title">Add New Design</h2>
        <AddDesign />
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Pending Designs</h2>
        <Pending />
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Completed Designs</h2>
        <Completed />
      </section>
    </div>
  );
}
