import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function PendingSection() {
  const { designs, markCompleted } = useAppContext();
  const [search, setSearch] = useState('');
  
  const pendingDesigns = designs.filter(d => 
    d.status === 'pending' && 
    (d.sku.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="section-container">
      <input 
        type="text" 
        className="search-bar fancy-shadow" 
        placeholder="Search Pending Designs..." 
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {pendingDesigns.length === 0 ? (
        <div className="empty-state">
          No pending designs. Add one above!
        </div>
      ) : (
        <div className="design-grid">
          {pendingDesigns.map(design => (
            <div key={design.id} className="design-card fancy-hover">
              <div className="design-image-container">
                {design.photo ? (
                  <img src={design.photo} alt={design.sku} className="design-image" />
                ) : (
                  <div className="empty-preview" style={{ height: '100%', background: '#eee' }}>No Image</div>
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
                <span className="checkbox-text">Mark as Completed</span>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
