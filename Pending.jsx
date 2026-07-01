import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { Plus, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Pending() {
  const { designs, markCompleted } = useAppContext();
  const [search, setSearch] = useState('');
  
  const pendingDesigns = designs.filter(d => 
    d.status === 'pending' && 
    (d.sku.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleExport = () => {
    const data = pendingDesigns.map(design => ({
      Design: design.sku,
      Platform: design.platform,
      Price: design.price
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pending Designs");
    XLSX.writeFile(wb, "Pending_Designs.xlsx");
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={handleExport} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#10b981', color: 'white' }}>
          <Download size={18} />
          Export Excel
        </button>
        <Link to="/add" className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} />
          Add New Design
        </Link>
      </div>

      <input 
        type="text" 
        className="search-bar" 
        placeholder="Search Designs..." 
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {pendingDesigns.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No pending designs found.
        </div>
      ) : (
        <div className="design-grid">
          {pendingDesigns.map(design => (
            <div key={design.id} className="design-card">
              <div className="design-image-container">
                {design.photo ? (
                  <img src={design.photo} alt={design.sku} className="design-image" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>
                    No Image
                  </div>
                )}
                <div className="price-badge">₹{design.price}</div>
              </div>
              
              <div className="design-info">
                <div className="design-sku">{design.sku}</div>
                <div className="design-platform">Platform: {design.platform}</div>
              </div>

              <label className="checkbox-wrapper">
                <input 
                  type="checkbox" 
                  onChange={() => markCompleted(design.id)}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Mark as Completed</span>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
