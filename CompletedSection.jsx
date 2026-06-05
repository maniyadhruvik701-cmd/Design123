import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function CompletedSection() {
  const { designs, setDesignStockStatus } = useAppContext();
  const [searchCompleted, setSearchCompleted] = useState('');
  const [searchStockOut, setSearchStockOut] = useState('');
  const [searchStockIn, setSearchStockIn] = useState('');
  const [selectedStockDesignId, setSelectedStockDesignId] = useState(null);
  
  const completedDesigns = designs.filter(d => 
    d.status === 'completed' &&
    (d.sku.toLowerCase().includes(searchCompleted.toLowerCase()) || d.description.toLowerCase().includes(searchCompleted.toLowerCase()))
  );

  const stockOutDesigns = designs.filter(d => 
    d.status === 'completed' && d.stockStatus === 'out' &&
    (d.sku.toLowerCase().includes(searchStockOut.toLowerCase()) || d.description.toLowerCase().includes(searchStockOut.toLowerCase()))
  );

  const stockInDesigns = designs.filter(d => 
    d.status === 'completed' && d.stockStatus === 'in' &&
    (d.sku.toLowerCase().includes(searchStockIn.toLowerCase()) || d.description.toLowerCase().includes(searchStockIn.toLowerCase()))
  );

  const handleStockSelect = (status) => {
    if (selectedStockDesignId) {
      setDesignStockStatus(selectedStockDesignId, status);
      setSelectedStockDesignId(null);
    }
  };

  return (
    <div className="section-container">
      {/* COMPLETED DESIGNS GRID */}
      <div>
        <input 
          type="text" 
          className="search-bar fancy-shadow" 
          placeholder="Search Completed Designs..." 
          value={searchCompleted}
          onChange={(e) => setSearchCompleted(e.target.value)}
        />

        {completedDesigns.length === 0 ? (
          <div className="empty-state" style={{ marginBottom: '2rem' }}>
            No completed designs yet.
          </div>
        ) : (
          <div className="design-grid" style={{ marginBottom: '3rem' }}>
            {completedDesigns.map(design => (
              <div key={design.id} className="design-card fancy-hover" style={{ opacity: 0.85 }}>
                <div 
                  className="design-image-container" 
                  onClick={() => setSelectedStockDesignId(design.id)}
                  style={{ cursor: 'pointer' }}
                  title="Click image to change stock status"
                >
                  {design.photo ? (
                    <img src={design.photo} alt={design.sku} className="design-image" style={{ filter: 'grayscale(20%)' }} />
                  ) : (
                    <div className="empty-preview" style={{ height: '100%', background: '#eee' }}>No Image</div>
                  )}
                  <div className="price-badge" style={{ background: '#10b981' }}>₹{design.price}</div>
                  <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Click to set Stock
                  </div>
                </div>
                
                <div className="design-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="design-sku">{design.sku}</div>
                    <span className="completed-tag">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Completed
                    </span>
                  </div>
                  <div className="design-platform">Platform: {design.platform}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STOCK IN DESIGNS GRID */}
      <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
        <h2 className="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'middle' }}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
          Stock In Designs
        </h2>
        <input 
          type="text" 
          className="search-bar fancy-shadow" 
          placeholder="Search Stock In Designs..." 
          value={searchStockIn}
          onChange={(e) => setSearchStockIn(e.target.value)}
        />

        {stockInDesigns.length === 0 ? (
          <div className="empty-state" style={{ marginBottom: '2rem' }}>
            No stock in designs yet.
          </div>
        ) : (
          <div className="design-grid" style={{ marginBottom: '3rem' }}>
            {stockInDesigns.map(design => (
              <div key={design.id} className="design-card fancy-hover" style={{ opacity: 0.85, borderColor: '#86efac' }}>
                <div 
                  className="design-image-container" 
                  onClick={() => setSelectedStockDesignId(design.id)}
                  style={{ cursor: 'pointer' }}
                  title="Click image to change stock status"
                >
                  {design.photo ? (
                    <img src={design.photo} alt={design.sku} className="design-image" />
                  ) : (
                    <div className="empty-preview" style={{ height: '100%', background: '#eee' }}>No Image</div>
                  )}
                  <div className="price-badge" style={{ background: '#10b981' }}>₹{design.price}</div>
                  <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(16, 185, 129, 0.9)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Click to set Stock
                  </div>
                </div>
                
                <div className="design-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="design-sku">{design.sku}</div>
                    <span className="completed-tag" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
                      Stock In
                    </span>
                  </div>
                  <div className="design-platform">Platform: {design.platform}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STOCK OUT DESIGNS GRID */}
      <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
        <h2 className="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'middle' }}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
          Stock Out Designs
        </h2>
        <input 
          type="text" 
          className="search-bar fancy-shadow" 
          placeholder="Search Stock Out Designs..." 
          value={searchStockOut}
          onChange={(e) => setSearchStockOut(e.target.value)}
        />

        {stockOutDesigns.length === 0 ? (
          <div className="empty-state">
            No stock out designs yet.
          </div>
        ) : (
          <div className="design-grid">
            {stockOutDesigns.map(design => (
              <div key={design.id} className="design-card fancy-hover" style={{ opacity: 0.85, borderColor: '#fca5a5' }}>
                <div 
                  className="design-image-container" 
                  onClick={() => setSelectedStockDesignId(design.id)}
                  style={{ cursor: 'pointer' }}
                  title="Click image to change stock status"
                >
                  {design.photo ? (
                    <img src={design.photo} alt={design.sku} className="design-image" />
                  ) : (
                    <div className="empty-preview" style={{ height: '100%', background: '#eee' }}>No Image</div>
                  )}
                  <div className="price-badge" style={{ background: '#ef4444' }}>₹{design.price}</div>
                  <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Click to set Stock
                  </div>
                </div>
                
                <div className="design-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="design-sku">{design.sku}</div>
                    <span className="completed-tag" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
                      Stock Out
                    </span>
                  </div>
                  <div className="design-platform">Platform: {design.platform}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stock Selection Modal Overlay */}
      {selectedStockDesignId && (
        <div className="modal-overlay active" onClick={() => setSelectedStockDesignId(null)}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '2.5rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ justifyContent: 'center', borderBottom: 'none', marginBottom: '1rem', paddingBottom: 0 }}>
              <h2 className="section-title" style={{ marginBottom: 0 }}>Select Stock Status</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Choose whether this design is in stock or out of stock.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button className="btn btn-primary" onClick={() => handleStockSelect('in')} style={{ backgroundColor: '#10b981', padding: '1rem', borderRadius: '8px', fontWeight: 700, width: '100%' }}>
                STOCK IN
              </button>
              <button className="btn btn-primary" onClick={() => handleStockSelect('out')} style={{ backgroundColor: '#ef4444', padding: '1rem', borderRadius: '8px', fontWeight: 700, width: '100%' }}>
                STOCK OUT
              </button>
              <button className="btn" onClick={() => handleStockSelect('none')} style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '1rem', borderRadius: '8px', fontWeight: 700, width: '100%', border: '1px solid var(--border-color)' }}>
                CLEAR STATUS (Back to Completed)
              </button>
              <button className="btn" onClick={() => setSelectedStockDesignId(null)} style={{ background: 'transparent', color: 'var(--text-muted)', padding: '0.5rem', marginTop: '0.5rem', width: '100%', border: '1px solid var(--border-color)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
