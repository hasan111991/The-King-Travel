import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAgency } from '../context/AgencyContext';

export function WhatsAppButton() {
  const { settings } = useAgency();
  const navigate = useNavigate();

  const cleanDigits = (settings.whatsappNumber || '').replace(/[^\d]/g, '');

  const handleClick = () => {
    if (cleanDigits.length >= 10) {
      const msg = encodeURIComponent('Hello The King Travel, I would like assistance with my travel booking.');
      window.location.href = `https://wa.me/${cleanDigits}?text=${msg}`;
      return;
    }
    navigate('/contact');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Contact customer support via WhatsApp or inquiry desk"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#0F2942] text-white border border-[#FD8F1C]/60 shadow-lg hover:bg-[#1C3D5A] transition-colors min-h-[44px]"
    >
      <MessageCircle className="w-5 h-5 text-[#FD8F1C]" aria-hidden="true" />
      <span className="text-xs font-semibold whitespace-nowrap hidden sm:inline">
        {cleanDigits.length >= 10 ? 'WhatsApp Support' : 'Travel Support'}
      </span>
    </button>
  );
}
