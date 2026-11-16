import React from 'react';
import { Link } from 'react-router-dom';
import { TRAVEL_SERVICES } from '../lib/defaultData';

export function ServicesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-semibold text-[#FD8F1C] mb-2">Agency Capabilities</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2942]">
          Travel Services
        </h1>
        <p className="text-sm text-[#486581] mt-3 leading-relaxed">
          From discounted airline tickets and 3 Check Bags deals to luxury & budget hotel stays, Hajj & Umrah coordination, custom tour packages, and corporate group bookings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TRAVEL_SERVICES.map((svc) => (
          <div key={svc.id} className="bg-white border border-[#D9E2EC] rounded-xl p-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-xs font-semibold text-[#FD8F1C]">{svc.number}</span>
              <h2 className="text-xl font-bold text-[#0F2942] mt-2">{svc.title}</h2>
              <p className="text-sm text-[#486581] mt-2 leading-relaxed">{svc.description}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E6ECF2] flex items-center justify-between">
              <Link
                to={`/contact?subject=${encodeURIComponent(`Service Request: ${svc.title}`)}`}
                className="text-xs font-semibold text-[#FD8F1C] hover:text-[#0F2942]"
              >
                Request Consultation →
              </Link>
              <Link
                to={
                  svc.id === 'hotel-reservations'
                    ? '/hotels'
                    : svc.id === 'hajj-umrah'
                    ? '/hajj-umrah'
                    : svc.id === 'custom-tour-packages' || svc.id === 'honeymoon-packages'
                    ? '/packages'
                    : '/flights'
                }
                className="text-xs font-semibold text-[#0F2942] hover:underline"
              >
                Explore Service
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
