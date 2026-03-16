import React, { useEffect, useState } from "react";
import api from "../../utils/api";
import { Settings, Save, IndianRupee } from "lucide-react";

const SystemSettings = () => {
  const [form, setForm] = useState({
    consultation_fee: 0,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // 🔥 Fetching the actual fee from the backend
      const res = await api.get("/admin/consultation-fee");
      
      setForm({
        consultation_fee: res.data.fee || 0,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      // Pushing the updated fee to the backend
      await api.put("/admin/consultation-fee", form);
      setSuccess(true);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Live Preview Calculation
  const finalTotal = Number(form.consultation_fee);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white shadow-2xl rounded-2xl p-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Settings className="text-blue-600" size={28} />
          <h1 className="text-2xl font-bold">
            Hospital System Configuration
          </h1>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 gap-8">

          {/* Consultation Fee */}
          <div>
            <label className="font-semibold mb-2 block">
              Consultation Fee
            </label>
            <div className="flex border rounded-lg overflow-hidden">
              <span className="bg-gray-200 px-4 py-2 flex items-center justify-center">
                <IndianRupee size={18} />
              </span>
              <input
                type="number"
                name="consultation_fee"
                value={form.consultation_fee}
                onChange={handleChange}
                className="w-full p-3 outline-none"
                placeholder="Enter base consultation fee"
                required
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-gray-100 p-6 rounded-xl">
            <h3 className="font-semibold mb-2 text-gray-700">Live Billing Preview</h3>
            <p className="font-bold text-2xl text-gray-900">
              Final Total: ₹{finalTotal.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">This is the default amount charged to patients for standard consultations.</p>
          </div>

          {/* Save Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl transition flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Save size={18} />
              {loading ? "Saving..." : "Save Settings"}
            </button>

            {success && (
              <p className="text-green-600 mt-3 font-medium">
                Settings updated successfully ✔
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default SystemSettings;