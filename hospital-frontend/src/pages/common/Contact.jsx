import React from 'react';
import { PageHeader } from '../../components/common';
import { Phone, Mail, MapPin, Clock, ShieldAlert } from 'lucide-react';

export default function Contact() {
  return (
    <div>
      <PageHeader title="Contact Directory" subtitle="Important contacts and support details" />

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Main Hospital Contact */}
        <div className="card lg:col-span-2 bg-blue-50 border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 text-white rounded-lg">
              <MapPin size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">MediCare Hospital</h2>
              <p className="text-sm text-gray-600">Main Branch</p>
            </div>
          </div>
          <div className="space-y-3 mt-6">
            <div className="flex items-center gap-3 text-gray-700">
              <MapPin className="text-gray-400" size={18} />
              <span>123 Health Avenue, Medical District, Cityville 40001</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Phone className="text-gray-400" size={18} />
              <span>+1 (800) 123-4567 (24/7 Helpline)</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Mail className="text-gray-400" size={18} />
              <span>contact@medicare-hms.com</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Clock className="text-gray-400" size={18} />
              <span>Emergency Services: Open 24 Hours</span>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="card bg-red-50 border-red-100 flex flex-col justify-center items-center text-center">
          <ShieldAlert size={48} className="text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-red-900">Emergency Response</h3>
          <p className="text-sm text-red-700 mt-2 mb-4">
            For critical medical emergencies requiring immediate assistance.
          </p>
          <a href="tel:911" className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition">
            Call Emergency Desk
          </a>
        </div>

        {/* Internal Departments */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="text-blue-600" size={20} />
            <h3 className="font-semibold text-gray-900">Department Extensions</h3>
          </div>
          <ul className="space-y-3 text-sm divide-y divide-gray-100">
            <li className="flex justify-between pt-2">
              <span className="text-gray-600">Reception Desk</span>
              <span className="font-medium text-gray-900">Ext: 101</span>
            </li>
            <li className="flex justify-between pt-2">
              <span className="text-gray-600">Pharmacy</span>
              <span className="font-medium text-gray-900">Ext: 204</span>
            </li>
            <li className="flex justify-between pt-2">
              <span className="text-gray-600">Laboratory</span>
              <span className="font-medium text-gray-900">Ext: 305</span>
            </li>
            <li className="flex justify-between pt-2">
              <span className="text-gray-600">Billing Office</span>
              <span className="font-medium text-gray-900">Ext: 402</span>
            </li>
          </ul>
        </div>

        {/* IT Support (Good for Staff) */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="text-blue-600" size={20} />
            <h3 className="font-semibold text-gray-900">IT & System Support</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Having trouble logging in, generating bills, or finding patient records? Contact the IT administration team.
          </p>
          <div className="bg-gray-50 p-3 rounded text-sm text-gray-800 border border-gray-100">
            <strong>Email:</strong> it-support@medicare-hms.com <br/>
            <strong>Response Time:</strong> Within 2 hours
          </div>
        </div>

      </div>
    </div>
  );
}