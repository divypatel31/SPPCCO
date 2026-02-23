import React, { useEffect, useState } from "react";
import api from "../../utils/api";
import { Settings, Save, IndianRupee, Percent } from "lucide-react";

const SystemSettings = () => {
  const [form, setForm] = useState({
    consultation_fee: 0,
    tax_percent: 0,
    discount_percent: 0,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get("/admin/profile");
      setForm({
        consultation_fee: res.data.consultation_fee || 0,
        tax_percent: res.data.tax_percent || 0,
        discount_percent: res.data.discount_percent || 0,
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
      await api.put("/admin/system-settings", form);
      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Live Preview Calculation
  const subtotal = Number(form.consultation_fee);
  const taxAmount = (subtotal * Number(form.tax_percent)) / 100;
  const discountAmount =
    (subtotal * Number(form.discount_percent)) / 100;
  const finalTotal = subtotal + taxAmount - discountAmount;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-2xl p-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Settings className="text-blue-600" size={28} />
          <h1 className="text-2xl font-bold">
            Hospital System Configuration
          </h1>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Consultation Fee */}
          <div>
            <label className="font-semibold mb-2 block">
              Consultation Fee
            </label>
            <div className="flex border rounded-lg overflow-hidden">
              <span className="bg-gray-200 px-4 py-2">
                <IndianRupee size={18} />
              </span>
              <input
                type="number"
                name="consultation_fee"
                value={form.consultation_fee}
                onChange={handleChange}
                className="w-full p-2 outline-none"
              />
            </div>
          </div>

          {/* Tax */}
          <div>
            <label className="font-semibold mb-2 block">
              Tax Percentage
            </label>
            <div className="flex border rounded-lg overflow-hidden">
              <span className="bg-gray-200 px-4 py-2">
                <Percent size={18} />
              </span>
              <input
                type="number"
                name="tax_percent"
                value={form.tax_percent}
                onChange={handleChange}
                className="w-full p-2 outline-none"
              />
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="font-semibold mb-2 block">
              Default Discount %
            </label>
            <div className="flex border rounded-lg overflow-hidden">
              <span className="bg-gray-200 px-4 py-2">
                <Percent size={18} />
              </span>
              <input
                type="number"
                name="discount_percent"
                value={form.discount_percent}
                onChange={handleChange}
                className="w-full p-2 outline-none"
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-gray-100 p-6 rounded-xl">
            <h3 className="font-semibold mb-4">Live Billing Preview</h3>

            <p>Consultation: ₹{subtotal}</p>
            <p>Tax ({form.tax_percent}%): ₹{taxAmount.toFixed(2)}</p>
            <p>Discount ({form.discount_percent}%): ₹{discountAmount.toFixed(2)}</p>

            <hr className="my-3" />

            <p className="font-bold text-lg">
              Final Total: ₹{finalTotal.toFixed(2)}
            </p>
          </div>

          {/* Save Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl transition flex items-center gap-2"
            >
              <Save size={18} />
              {loading ? "Saving..." : "Save All Settings"}
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