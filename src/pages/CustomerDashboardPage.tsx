import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Bell,
  CreditCard,
  Download,
  Edit2,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Plane,
  Plus,
  Send,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { CustomerFlightRequestsTab } from '../components/CustomerFlightRequestsTab';
import { useAgency } from '../context/AgencyContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatMoney } from '../lib/defaultData';
import { db, generateId, handleFirestoreError, OperationType } from '../lib/firebase';
import { downloadBookingConfirmationPdf } from '../lib/pdfGenerator';
import type {
  BookingRecord,
  FlightRequestRecord,
  InquiryItem,
  NotificationItem,
  PaymentRecord,
  SavedPassenger,
} from '../types/travel';

type DashboardTab = 'requests' | 'bookings' | 'passengers' | 'payments' | 'profile' | 'notifications' | 'support';
type BookingFilter = 'all' | 'pending' | 'confirmed' | 'cancelled';

export function CustomerDashboardPage() {
  const { user, profile, authReady, logout, updateUserProfile, changeUserPassword } = useAuth();
  const { settings } = useAgency();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<DashboardTab>(
    searchParams.get('tab') === 'requests' ? 'requests' : 'bookings'
  );
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('all');

  const [flightRequests, setFlightRequests] = useState<FlightRequestRecord[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [savedPassengers, setSavedPassengers] = useState<SavedPassenger[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Saved passenger form state
  const [editingPassengerId, setEditingPassengerId] = useState<string | null>(null);
  const [paxFirstName, setPaxFirstName] = useState('');
  const [paxLastName, setPaxLastName] = useState('');
  const [paxDob, setPaxDob] = useState('');
  const [paxGender, setPaxGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [paxNationality, setPaxNationality] = useState('United States');
  const [paxPassportNumber, setPaxPassportNumber] = useState('');
  const [paxPassportExpiry, setPaxPassportExpiry] = useState('');
  const [savingPassenger, setSavingPassenger] = useState(false);

  // Profile edit state
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');
  const [nationalityInput, setNationalityInput] = useState('United States');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Receipt upload modal state
  const [uploadingFor, setUploadingFor] = useState<BookingRecord | null>(null);
  const [receiptMethod, setReceiptMethod] = useState('Bank Transfer');
  const [receiptRef, setReceiptRef] = useState('');
  const [receiptFileUrl, setReceiptFileUrl] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [submittingReceipt, setSubmittingReceipt] = useState(false);

  // Support ticket state
  const [supportBookingId, setSupportBookingId] = useState('');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [submittingSupport, setSubmittingSupport] = useState(false);

  useEffect(() => {
    if (authReady && !user) {
      navigate('/login', { state: { from: '/my-bookings' }, replace: true });
    }
  }, [authReady, user, navigate]);

  useEffect(() => {
    if (profile) {
      setNameInput(profile.name || '');
      setPhoneInput(profile.phone || '');
      setWhatsappInput(profile.whatsapp || '');
      setNationalityInput(profile.nationality || 'United States');
    }
  }, [profile]);

  useEffect(() => {
    if (!authReady || !user) return;
    setLoadingData(true);

    const unsubBookings = onSnapshot(
      query(collection(db, 'bookings'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as BookingRecord);
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setBookings(list);
        setLoadingData(false);
      },
      (err) => {
        setLoadingData(false);
        handleFirestoreError(err, OperationType.LIST, 'bookings');
      }
    );

    const unsubPayments = onSnapshot(
      query(collection(db, 'payments'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as PaymentRecord);
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setPayments(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'payments')
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as NotificationItem);
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setNotifications(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    const unsubInq = onSnapshot(
      query(collection(db, 'inquiries'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as InquiryItem);
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setInquiries(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'inquiries')
    );

    const unsubPassengers = onSnapshot(
      query(collection(db, 'passengers'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as SavedPassenger);
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setSavedPassengers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'passengers')
    );

    // Subscribe to flightRequests owned by uid or matching verified email
    let uidMap = new Map<string, FlightRequestRecord>();
    let emailMap = new Map<string, FlightRequestRecord>();
    const syncMergedRequests = () => {
      const merged = new Map<string, FlightRequestRecord>([...uidMap, ...emailMap]);
      const sorted = Array.from(merged.values()).sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setFlightRequests(sorted);
      setLoadingRequests(false);
    };

    let unsubReqUid = () => {};
    let unsubReqEmail = () => {};

    if (user.emailVerified) {
      unsubReqUid = onSnapshot(
        query(collection(db, 'flightRequests'), where('userId', '==', user.uid)),
        (snap) => {
          uidMap = new Map(snap.docs.map((d) => [d.id, d.data() as FlightRequestRecord]));
          syncMergedRequests();
        },
        () => setLoadingRequests(false)
      );

      if (user.email) {
        unsubReqEmail = onSnapshot(
          query(collection(db, 'flightRequests'), where('email', '==', user.email)),
          (snap) => {
            emailMap = new Map(snap.docs.map((d) => [d.id, d.data() as FlightRequestRecord]));
            syncMergedRequests();
          },
          () => setLoadingRequests(false)
        );
      }
    } else {
      setLoadingRequests(false);
    }

    return () => {
      unsubBookings();
      unsubPayments();
      unsubNotifs();
      unsubInq();
      unsubPassengers();
      unsubReqUid();
      unsubReqEmail();
    };
  }, [authReady, user]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (bookingFilter === 'all') return true;
      if (bookingFilter === 'pending') {
        return [
          'New Request',
          'Pending Payment',
          'Payment Verification',
          'Supplier Confirmation Pending',
        ].includes(b.bookingStatus);
      }
      if (bookingFilter === 'confirmed') {
        return ['Payment Confirmed', 'Ticket Issued'].includes(b.bookingStatus);
      }
      return ['Cancelled', 'Refund Requested', 'Refunded'].includes(b.bookingStatus);
    });
  }, [bookings, bookingFilter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      showToast('Invalid File', 'Upload JPG, PNG, WebP, or PDF only.', 'error');
      return;
    }
    if (file.size > 450 * 1024) {
      showToast('File Too Large', 'Receipt must be under 450 KB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptFileUrl(String(reader.result || ''));
      setReceiptFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uploadingFor || !receiptFileUrl) return;
    setSubmittingReceipt(true);
    const paymentId = generateId('pay');
    try {
      await setDoc(doc(db, 'payments', paymentId), {
        paymentId,
        bookingId: uploadingFor.bookingId,
        userId: user.uid,
        amount: uploadingFor.totalAmount,
        currency: uploadingFor.currency,
        paymentMethod: receiptMethod,
        receiptUrl: receiptFileUrl,
        receiptFileName,
        transactionReference: receiptRef.trim() || 'Receipt Upload',
        verificationStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'bookings', uploadingFor.bookingId), {
        paymentMethod: receiptMethod,
        paymentStatus: 'pending_verification',
        bookingStatus: 'Payment Verification',
        updatedAt: serverTimestamp(),
      });

      showToast(
        'Receipt Submitted',
        'Your payment receipt is now awaiting admin verification.',
        'success'
      );
      setUploadingFor(null);
      setReceiptFileUrl('');
      setReceiptFileName('');
      setReceiptRef('');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `payments/${paymentId}`);
      } catch {
        showToast('Upload Failed', 'Unable to submit receipt.', 'error');
      }
    } finally {
      setSubmittingReceipt(false);
    }
  };

  const handleRequestCancellation = async (booking: BookingRecord) => {
    const isPaid = booking.paymentStatus === 'confirmed';
    const nextStatus = isPaid ? 'Refund Requested' : 'Cancelled';
    try {
      await updateDoc(doc(db, 'bookings', booking.bookingId), {
        bookingStatus: nextStatus,
        refundReason: isPaid
          ? 'Customer requested cancellation & refund via portal.'
          : 'Cancelled by customer prior to payment verification.',
        updatedAt: serverTimestamp(),
      });
      showToast('Status Updated', `Booking updated to ${nextStatus}.`, 'info');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.bookingId}`);
      } catch {
        showToast('Action Denied', 'Terminal bookings cannot be modified.', 'error');
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showToast('Validation Error', 'Name cannot be empty.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      await updateUserProfile({
        name: nameInput,
        phone: phoneInput,
        whatsapp: whatsappInput,
        nationality: nationalityInput,
      });
      showToast('Profile Updated', 'Your personal details have been saved.', 'success');
    } catch {
      showToast('Update Failed', 'Could not update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Weak Password', 'Password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Mismatch', 'Passwords do not match.', 'error');
      return;
    }
    try {
      await changeUserPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password Changed', 'Your account password has been updated.', 'success');
    } catch (err) {
      showToast(
        'Re-authentication Needed',
        err instanceof Error ? err.message : 'Please sign in again before changing password.',
        'error'
      );
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supportSubject.trim() || !supportMessage.trim()) return;
    setSubmittingSupport(true);
    const inquiryId = generateId('inq');
    try {
      await setDoc(doc(db, 'inquiries', inquiryId), {
        inquiryId,
        userId: user.uid,
        bookingId: supportBookingId || null,
        name: profile?.name || user.displayName || 'Customer',
        email: profile?.email || user.email || '',
        phone: profile?.phone || 'N/A',
        subject: supportSubject.trim(),
        message: supportMessage.trim(),
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSupportSubject('');
      setSupportMessage('');
      setSupportBookingId('');
      showToast('Inquiry Sent', 'Our support team has received your request.', 'success');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `inquiries/${inquiryId}`);
      } catch {
        showToast('Error', 'Unable to submit support inquiry.', 'error');
      }
    } finally {
      setSubmittingSupport(false);
    }
  };

  const markNotificationRead = async (n: NotificationItem) => {
    if (n.read) return;
    try {
      await updateDoc(doc(db, 'notifications', n.notificationId), { read: true });
    } catch (err) {
      console.warn('Mark read error:', err);
    }
  };

  const resetPassengerForm = () => {
    setEditingPassengerId(null);
    setPaxFirstName('');
    setPaxLastName('');
    setPaxDob('');
    setPaxGender('Male');
    setPaxNationality('United States');
    setPaxPassportNumber('');
    setPaxPassportExpiry('');
  };

  const handleEditPassenger = (pax: SavedPassenger) => {
    setEditingPassengerId(pax.passengerId);
    setPaxFirstName(pax.firstName);
    setPaxLastName(pax.lastName);
    setPaxDob(pax.dateOfBirth);
    setPaxGender(pax.gender);
    setPaxNationality(pax.nationality);
    setPaxPassportNumber(pax.passportNumber || '');
    setPaxPassportExpiry(pax.passportExpiry || '');
  };

  const handleSavePassenger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!paxFirstName.trim() || !paxLastName.trim() || !paxDob || !paxNationality.trim()) {
      showToast('Missing Details', 'First name, last name, DOB, and nationality are required.', 'error');
      return;
    }
    setSavingPassenger(true);
    try {
      if (editingPassengerId) {
        await updateDoc(doc(db, 'passengers', editingPassengerId), {
          firstName: paxFirstName.trim(),
          lastName: paxLastName.trim(),
          dateOfBirth: paxDob,
          gender: paxGender,
          nationality: paxNationality.trim(),
          passportNumber: paxPassportNumber.trim().toUpperCase(),
          passportExpiry: paxPassportExpiry,
          updatedAt: serverTimestamp(),
        });
        showToast('Traveler Updated', 'Saved traveler profile updated.', 'success');
      } else {
        const passengerId = generateId('pax');
        await setDoc(doc(db, 'passengers', passengerId), {
          passengerId,
          userId: user.uid,
          firstName: paxFirstName.trim(),
          lastName: paxLastName.trim(),
          dateOfBirth: paxDob,
          gender: paxGender,
          nationality: paxNationality.trim(),
          passportNumber: paxPassportNumber.trim().toUpperCase(),
          passportExpiry: paxPassportExpiry,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast('Traveler Saved', 'You can now pre-fill this traveler during checkout.', 'success');
      }
      resetPassengerForm();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, 'passengers');
      } catch {
        showToast('Save Failed', 'Unable to save passenger details.', 'error');
      }
    } finally {
      setSavingPassenger(false);
    }
  };

  const handleDeletePassenger = async (passengerId: string) => {
    try {
      await deleteDoc(doc(db, 'passengers', passengerId));
      if (editingPassengerId === passengerId) resetPassengerForm();
      showToast('Traveler Removed', 'Saved traveler profile deleted.', 'info');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `passengers/${passengerId}`);
      } catch {
        showToast('Delete Failed', 'Unable to delete traveler profile.', 'error');
      }
    }
  };

  if (!authReady || !user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-sm text-[#627D98]">
        Loading your traveler account...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-[#D9E2EC]">
        <div>
          <p className="text-xs font-semibold text-[#FD8F1C]">Customer Portal</p>
          <h1 className="font-display text-3xl font-bold text-[#0F2942] mt-1">
            Welcome, {profile?.name || user.displayName || 'Traveler'}
          </h1>
          <p className="text-xs text-[#627D98] mt-1">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/flight-request"
            className="px-4 py-2 rounded-lg bg-[#FD8F1C] text-white text-xs font-bold hover:bg-[#E07A0E]"
          >
            New Flight Request
          </Link>
          <Link
            to="/flights"
            className="px-4 py-2 rounded-lg bg-[#0F2942] text-white text-xs font-semibold hover:bg-[#193B5C]"
          >
            Flight Search
          </Link>
          <button
            type="button"
            onClick={() => logout().then(() => navigate('/'))}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#D9E2EC] bg-white text-xs font-semibold text-[#243B53] hover:bg-[#F9F9FA]"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3">
          <nav className="bg-white border border-[#D9E2EC] rounded-xl p-2 space-y-1">
            {[
              { id: 'requests', label: 'Flight Requests', icon: Send, count: flightRequests.length },
              { id: 'bookings', label: 'My Bookings', icon: Plane, count: bookings.length },
              { id: 'passengers', label: 'Saved Travelers', icon: Users, count: savedPassengers.length },
              { id: 'payments', label: 'Payment History', icon: CreditCard, count: payments.length },
              { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadCount },
              { id: 'support', label: 'Contact Support', icon: HelpCircle, count: inquiries.length },
              { id: 'profile', label: 'Profile & Security', icon: User, count: 0 },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id as DashboardTab)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#0F2942] text-white'
                      : 'text-[#243B53] hover:bg-[#F9F9FA]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                  {item.count > 0 && (
                    <span className={`font-mono text-xs ${active ? 'text-[#FD8F1C]' : 'text-[#627D98]'}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-6">
          {/* FLIGHT REQUESTS TAB */}
          {tab === 'requests' && (
            <CustomerFlightRequestsTab
              requests={flightRequests}
              settings={settings}
              user={user}
              loading={loadingRequests}
              onToast={showToast}
            />
          )}

          {/* BOOKINGS TAB */}
          {tab === 'bookings' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex p-1 bg-[#F0F4F8] rounded-lg">
                  {(
                    [
                      { id: 'all', label: 'All Bookings' },
                      { id: 'pending', label: 'Pending' },
                      { id: 'confirmed', label: 'Confirmed' },
                      { id: 'cancelled', label: 'Cancelled / Refunds' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setBookingFilter(f.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        bookingFilter === f.id
                          ? 'bg-white text-[#102A43] shadow-xs'
                          : 'text-[#486581] hover:text-[#102A43]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingData ? (
                <div className="bg-white border border-[#D9E2EC] rounded-xl p-8 text-center text-sm text-[#627D98]">
                  Loading your bookings...
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="bg-white border border-[#D9E2EC] rounded-xl p-10 text-center">
                  <Plane className="w-8 h-8 text-[#627D98] mx-auto mb-3" />
                  <h2 className="text-base font-bold text-[#102A43]">No bookings in this view</h2>
                  <p className="text-sm text-[#486581] mt-1">
                    Search available flights to submit a booking request.
                  </p>
                  <Link
                    to="/flights"
                    className="mt-4 inline-block px-5 py-2.5 rounded-lg bg-[#FD8F1C] text-white text-xs font-bold hover:bg-[#E07A0E]"
                  >
                    Search Flights
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map((b) => {
                    const fd = b.flightDetails || {};
                    const canUploadReceipt =
                      b.paymentStatus === 'unpaid' || b.paymentStatus === 'rejected';
                    const canDownloadTicket =
                      b.bookingStatus === 'Ticket Issued' && Boolean(b.ticketFileUrl);
                    const canCancel = ![
                      'Ticket Issued',
                      'Cancelled',
                      'Refund Requested',
                      'Refunded',
                    ].includes(b.bookingStatus);

                    return (
                      <div
                        key={b.bookingId}
                        className="bg-white border border-[#D9E2EC] rounded-xl p-5 sm:p-6 space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E6ECF2]">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#627D98]">
                            <span className="font-mono font-bold text-[#102A43]">
                              {b.bookingReference}
                            </span>
                            <span>·</span>
                            <span>{b.mode === 'demo' ? 'Demo Sandbox' : 'Live Booking'}</span>
                            <span>·</span>
                            <span>Payment: {b.paymentStatus.replace(/_/g, ' ')}</span>
                          </div>
                          <span className="text-xs font-bold text-[#102A43]">
                            {b.bookingStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                          <div>
                            <p className="text-base font-bold text-[#102A43]">
                              {fd.originCode || '-'} → {fd.destinationCode || '-'}
                            </p>
                            <p className="text-xs text-[#486581] mt-0.5">
                              {fd.airline} ({fd.flightNumber}) · {fd.departureDate}
                            </p>
                          </div>
                          <div className="text-xs text-[#486581]">
                            <p>Passengers: {b.passengers?.length || 1}</p>
                            {b.supplierReference && (
                              <p className="font-mono text-[#102A43] mt-0.5">
                                Supplier PNR: {b.supplierReference}
                              </p>
                            )}
                          </div>
                          <div className="sm:text-right">
                            <p className="text-[11px] text-[#627D98]">{b.paymentMethod}</p>
                            <p className="font-mono text-lg font-bold text-[#102A43] tabular-nums">
                              {b.totalAmount > 0
                                ? formatMoney(b.totalAmount, b.currency)
                                : 'Quotation Pending'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[#F0F4F8]">
                          <Link
                            to={`/booking/${b.bookingId}`}
                            className="px-3.5 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#102A43] hover:bg-[#F7F9FC]"
                          >
                            View Details
                          </Link>
                          <button
                            type="button"
                            onClick={() => downloadBookingConfirmationPdf(b, settings.agencyName)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#102A43] hover:bg-[#F7F9FC]"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Booking Invoice PDF
                          </button>

                          {canUploadReceipt && (
                            <button
                              type="button"
                              onClick={() => {
                                setUploadingFor(b);
                                setReceiptMethod(b.paymentMethod || 'Bank Transfer');
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FD8F1C] text-white text-xs font-bold hover:bg-[#E07A0E]"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Upload Payment Receipt
                            </button>
                          )}

                          {canDownloadTicket && (
                            <a
                              href={b.ticketFileUrl}
                              download={b.ticketFileName || `${b.bookingReference}_Eticket.pdf`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download Confirmed E-Ticket
                            </a>
                          )}

                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => handleRequestCancellation(b)}
                              className="ml-auto text-xs font-semibold text-red-600 hover:underline"
                            >
                              Cancel / Request Refund
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* SAVED TRAVELERS TAB */}
          {tab === 'passengers' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleSavePassenger}
                className="lg:col-span-5 bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-4 self-start"
              >
                <div className="flex items-center justify-between border-b border-[#E6ECF2] pb-3">
                  <h2 className="text-base font-bold text-[#0F2942]">
                    {editingPassengerId ? 'Edit Saved Traveler' : 'Add Saved Traveler'}
                  </h2>
                  {editingPassengerId && (
                    <button
                      type="button"
                      onClick={resetPassengerForm}
                      className="text-xs font-semibold text-[#627D98] hover:text-[#0F2942]"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#486581] mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={paxFirstName}
                      onChange={(e) => setPaxFirstName(e.target.value)}
                      placeholder="As on passport"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#486581] mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={paxLastName}
                      onChange={(e) => setPaxLastName(e.target.value)}
                      placeholder="Surname"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#486581] mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().slice(0, 10)}
                      value={paxDob}
                      onChange={(e) => setPaxDob(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942] tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#486581] mb-1">Gender *</label>
                    <select
                      value={paxGender}
                      onChange={(e) => setPaxGender(e.target.value as 'Male' | 'Female' | 'Other')}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Nationality *</label>
                  <input
                    type="text"
                    required
                    value={paxNationality}
                    onChange={(e) => setPaxNationality(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#486581] mb-1">Passport Number</label>
                    <input
                      type="text"
                      value={paxPassportNumber}
                      onChange={(e) => setPaxPassportNumber(e.target.value.toUpperCase())}
                      placeholder="Optional"
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm font-mono text-[#0F2942]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#486581] mb-1">Passport Expiry</label>
                    <input
                      type="date"
                      value={paxPassportExpiry}
                      onChange={(e) => setPaxPassportExpiry(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#0F2942] tabular-nums"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingPassenger}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  {savingPassenger
                    ? 'Saving...'
                    : editingPassengerId
                    ? 'Update Traveler Profile'
                    : 'Save Traveler Profile'}
                </button>
              </form>

              <div className="lg:col-span-7 bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-[#0F2942]">
                    Saved Passenger Profiles ({savedPassengers.length})
                  </h2>
                  <p className="text-xs text-[#627D98] mt-0.5">
                    Save family members or frequent travelers for one-click pre-fill during flight checkout.
                  </p>
                </div>

                {savedPassengers.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-[#D9E2EC] rounded-xl">
                    <Users className="w-8 h-8 text-[#9FB3C8] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#0F2942]">No saved travelers yet</p>
                    <p className="text-xs text-[#627D98] mt-1">
                      Use the form to store traveler details for faster bookings.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#E6ECF2]">
                    {savedPassengers.map((pax) => (
                      <div key={pax.passengerId} className="py-3.5 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-[#0F2942]">
                            {pax.firstName} {pax.lastName}
                          </p>
                          <p className="text-xs text-[#486581]">
                            {pax.gender} · DOB: <span className="tabular-nums">{pax.dateOfBirth}</span> · {pax.nationality}
                          </p>
                          {pax.passportNumber && (
                            <p className="text-xs font-mono text-[#627D98]">
                              Passport: {pax.passportNumber}
                              {pax.passportExpiry ? ` (Exp: ${pax.passportExpiry})` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditPassenger(pax)}
                            className="p-2 rounded-lg border border-[#D9E2EC] text-[#0F2942] hover:bg-[#F9F9FA]"
                            title="Edit traveler"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePassenger(pax.passengerId)}
                            className="p-2 rounded-lg border border-[#D9E2EC] text-red-600 hover:bg-red-50"
                            title="Delete traveler"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {tab === 'payments' && (
            <div className="bg-white border border-[#D9E2EC] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E6ECF2]">
                <h2 className="text-base font-bold text-[#102A43]">Payment History</h2>
              </div>
              {payments.length === 0 ? (
                <p className="p-8 text-center text-sm text-[#627D98]">
                  No payment receipts or transactions submitted yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F9FC] text-[#486581] border-b border-[#D9E2EC]">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Payment ID</th>
                        <th className="py-3 px-4 font-semibold">Method</th>
                        <th className="py-3 px-4 font-semibold">Reference</th>
                        <th className="py-3 px-4 font-semibold text-right">Amount</th>
                        <th className="py-3 px-4 font-semibold">Verification</th>
                        <th className="py-3 px-4 font-semibold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6ECF2]">
                      {payments.map((p) => (
                        <tr key={p.paymentId}>
                          <td className="py-3 px-4 font-mono text-[#102A43]">{p.paymentId}</td>
                          <td className="py-3 px-4">{p.paymentMethod}</td>
                          <td className="py-3 px-4 font-mono">{p.transactionReference || '-'}</td>
                          <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                            {formatMoney(p.amount, p.currency)}
                          </td>
                          <td className="py-3 px-4 font-semibold capitalize">
                            {p.verificationStatus}
                          </td>
                          <td className="py-3 px-4 text-[#627D98]">{p.adminRemarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {tab === 'notifications' && (
            <div className="bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-3">
              <h2 className="text-base font-bold text-[#102A43]">Booking Notifications</h2>
              {notifications.length === 0 ? (
                <p className="text-sm text-[#627D98] py-4">No notifications yet.</p>
              ) : (
                <div className="divide-y divide-[#E6ECF2]">
                  {notifications.map((n) => (
                    <div
                      key={n.notificationId}
                      onClick={() => markNotificationRead(n)}
                      className={`py-3.5 cursor-pointer ${n.read ? 'opacity-75' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-[#102A43]">{n.title}</p>
                        <span className="text-[11px] font-medium text-[#168AAD]">
                          {n.read ? 'Read' : 'New'}
                        </span>
                      </div>
                      <p className="text-xs text-[#486581] mt-1">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUPPORT TAB */}
          {tab === 'support' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form
                onSubmit={handleSupportSubmit}
                className="bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-[#102A43]">Booking Support Request</h2>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">
                    Related Booking (Optional)
                  </label>
                  <select
                    value={supportBookingId}
                    onChange={(e) => setSupportBookingId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                  >
                    <option value="">General Inquiry</option>
                    {bookings.map((b) => (
                      <option key={b.bookingId} value={b.bookingReference}>
                        {b.bookingReference} ({b.flightDetails?.originCode} →{' '}
                        {b.flightDetails?.destinationCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    placeholder="e.g. Date change or passport update"
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Message *</label>
                  <textarea
                    required
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingSupport}
                  className="w-full py-2.5 rounded-lg bg-[#102A43] text-white text-sm font-semibold"
                >
                  {submittingSupport ? 'Sending...' : 'Submit Support Request'}
                </button>
              </form>

              <div className="bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-4">
                <h2 className="text-base font-bold text-[#102A43]">Your Support History</h2>
                {inquiries.length === 0 ? (
                  <p className="text-sm text-[#627D98]">No support tickets submitted yet.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {inquiries.map((inq) => (
                      <div key={inq.inquiryId} className="p-3.5 rounded-lg bg-[#F7F9FC] border border-[#E6ECF2]">
                        <div className="flex justify-between gap-2 text-xs">
                          <span className="font-bold text-[#102A43]">{inq.subject}</span>
                          <span className="font-semibold text-[#168AAD] capitalize">{inq.status}</span>
                        </div>
                        <p className="text-xs text-[#486581] mt-1">{inq.message}</p>
                        {inq.adminReply && (
                          <div className="mt-2 pt-2 border-t border-[#D9E2EC] text-xs text-[#102A43]">
                            <strong>Agency Reply:</strong> {inq.adminReply}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PROFILE & SECURITY TAB */}
          {tab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form
                onSubmit={handleSaveProfile}
                className="bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-[#102A43]">Personal Information</h2>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={whatsappInput}
                    onChange={(e) => setWhatsappInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#486581] mb-1">Nationality</label>
                  <input
                    type="text"
                    value={nationalityInput}
                    onChange={(e) => setNationalityInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-lg bg-[#102A43] text-white text-xs font-semibold"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </form>

              <div className="bg-white border border-[#D9E2EC] rounded-xl p-6 space-y-4">
                <h2 className="text-base font-bold text-[#102A43] inline-flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#168AAD]" /> Account Security
                </h2>
                {user.providerData.some((p) => p.providerId === 'password') ? (
                  <form onSubmit={handlePasswordSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#486581] mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#486581] mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-lg bg-[#102A43] text-white text-xs font-semibold"
                    >
                      Update Password
                    </button>
                  </form>
                ) : (
                  <p className="text-xs text-[#486581] leading-relaxed">
                    Your account is authenticated via Google Sign-In ({user.email}). Password and multi-factor security are managed directly through your Google Account settings.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Upload Modal */}
      {uploadingFor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D9E2EC] max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#102A43]">
              Upload Receipt · {uploadingFor.bookingReference}
            </h3>
            <form onSubmit={handleUploadReceiptSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">Method</label>
                <select
                  value={receiptMethod}
                  onChange={(e) => setReceiptMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Easypaisa">Easypaisa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  required
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  placeholder="e.g. IBFT-123456"
                  className="w-full px-3 py-2 rounded-lg border border-[#D9E2EC] text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">
                  Receipt File (JPG, PNG, PDF &le; 450 KB)
                </label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleReceiptFileChange}
                  className="w-full text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadingFor(null)}
                  className="px-4 py-2 rounded-lg border border-[#D9E2EC] text-xs font-semibold text-[#486581]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReceipt || !receiptFileUrl}
                  className="px-5 py-2 rounded-lg bg-[#FD8F1C] hover:bg-[#E07A0E] text-white text-xs font-bold disabled:opacity-50"
                >
                  {submittingReceipt ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
