import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Image as ImageIcon, Video } from 'lucide-react';

export default function AddDesignSection() {
  const { addDesign } = useAppContext();

  const [formData, setFormData] = useState({
    photo: '',
    video: '',
    sku: '',
    price: '',
    description: '',
    platform: 'Shopify'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.sku || !formData.price || !formData.photo) return;
    addDesign(formData);
    // Reset form after submit
    setFormData({ photo: '', video: '', sku: '', price: '', description: '', platform: 'Shopify' });
  };

  return (
    <div className="add-design-wrapper">
      <div className="add-design-grid">
        
        <div className="image-preview-card">
          {formData.photo ? (
            <img src={formData.photo} alt="Preview" className="preview-img" />
          ) : (
            <div className="empty-preview">
              <ImageIcon size={48} color="var(--accent-primary)" style={{ opacity: 0.5 }} />
              <span>Image Preview</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="fancy-form">
          <div className="form-row">
            <div className="material-input-group">
              <input type="text" name="sku" className="material-input" value={formData.sku} onChange={handleChange} required />
              <label className={`material-label ${formData.sku ? 'active' : ''}`}>Design Name/Number*</label>
            </div>
            <div className="material-input-group">
              <input type="number" name="price" className="material-input" value={formData.price} onChange={handleChange} required />
              <label className={`material-label ${formData.price ? 'active' : ''}`}>Sales Price (₹)*</label>
            </div>
          </div>

          <div className="material-input-group">
            <input type="url" name="photo" className="material-input" value={formData.photo} onChange={handleChange} required />
            <label className={`material-label ${formData.photo ? 'active' : ''}`}>Photo URL*</label>
          </div>

          <div className="form-row">
            <div className="material-input-group">
              <input type="url" name="video" className="material-input" value={formData.video} onChange={handleChange} />
              <label className={`material-label ${formData.video ? 'active' : ''}`}>Video URL</label>
            </div>
            <div className="material-input-group">
              <select name="platform" className="material-input" value={formData.platform} onChange={handleChange}>
                <option value="All Platforms">All Platforms</option>
                <option value="Shopify">Shopify</option>
                <option value="Amazon">Amazon</option>
                <option value="Etsy">Etsy</option>
                <option value="Other">Other</option>
              </select>
              <label className="material-label active">Platform</label>
            </div>
          </div>

          <div className="material-input-group" style={{ marginBottom: '1rem' }}>
            <textarea name="description" className="material-input" value={formData.description} onChange={handleChange} />
            <label className={`material-label ${formData.description ? 'active' : ''}`}>Description</label>
          </div>

          <button type="submit" className="btn btn-primary btn-glow" style={{ width: '100%', marginTop: '1rem' }}>
            <Save size={20} />
            SAVE DESIGN
          </button>
        </form>

      </div>
    </div>
  );
}
