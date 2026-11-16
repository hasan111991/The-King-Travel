import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CheckCircle2, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useAgency } from '../context/AgencyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db, generateId, handleFirestoreError, OperationType } from '../lib/firebase';

export function ContactPage() {
  const [searchParams] = useSearchParams();
  const { settings } = useAgency();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast('Invalid Email', 'Please enter a valid email address.', 'error');
      return;
    }
    setSubmitting(true);
    const inquiryId = generateId('inq');
    try {
      await setDoc(doc(db, 'inquiries', inquiryId), {
        inquiryId,
        userId: user?.uid || null,
        bookingId: null,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: subject.trim(),
        message: message.trim(),
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSubmitted(true);
      setSubject('');
      setMessage('');
      showToast('Inquiry Saved', 'Our travel desk will respond shortly.', 'success');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `inquiries/${inquiryId}`);
      } catch {
        showToast('Submission Error', 'Unable to save inquiry right now.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-2xl mb-10">
        <p className="text-xs font-semibold text-[#FD8F1C] mb-2">Customer Support</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F2942]">Contact Us</h1>
        <p className="text-sm text-[#486581] mt-2">
          Reach our Dallas travel desk directly for discounted airline tickets, 3 Check Bags deals, hotel quotes, Umrah packages, or booking assistance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-5 text-sm">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#FD8F1C] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#0F2942]">Phone Lines</p>
                <p className="text-[#486581] mt-0.5">{settings.contactPhone}</p>
                {settings.secondaryPhone && (
                  <p className="text-[#486581] mt-0.5">{settings.secondaryPhone}</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#FD8F1C] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#0F2942]">Email Support</p>
                <p className="text-[#486581] mt-0.5 break-all">{settings.contactEmail}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-[#FD8F1C] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#0F2942]">WhatsApp Support</p>
                <p className="text-[#486581] mt-0.5">
                  {settings.whatsappNumber || 'Configure WhatsApp number in Admin Settings'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#FD8F1C] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#0F2942]">Office Location</p>
                <p className="text-[#486581] mt-0.5">{settings.officeAddress}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          {submitted ? (
            <div className="bg-white border border-[#D9E2EC] rounded-xl p-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h2 className="text-lg font-bold text-[#0F2942]">Message Received</h2>
              <p className="text-sm text-[#486581]">
                Your inquiry has been logged in our system. Our travel consultant will follow up shortly.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-2 px-5 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-[#D9E2EC] rounded-xl p-6 sm:p-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">Message *</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your travel dates, route, or question..."
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-sm font-bold disabled:opacity-60"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
