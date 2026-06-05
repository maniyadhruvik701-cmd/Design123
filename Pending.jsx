import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

export default function Pending() {
  const { designs, markCompleted } = useAppContext();
  const [search, setSearch] = useState('');
  
  const pendingDesigns = designs.filter(d => 
    d.status === 'pending' && 
    (d.sku.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <Link to="/add" className="btn btn-primary" style={{ textDecoration: 'none' }}>
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
