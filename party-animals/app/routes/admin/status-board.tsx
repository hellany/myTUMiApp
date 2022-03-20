import { LoaderFunction, redirect } from 'remix';
import { authenticator } from '~/services/auth.server';
import { Group, Registration, Role, User } from '~/generated/prisma';
import { db } from '~/utils/db.server';
import { useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { ValidationMessage } from '~/components/ValidationMessage';

export const loader: LoaderFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request);
  if (!user) {
    return redirect('/auth/login');
  }
  if (user.role !== Role.ADMIN) {
    throw new Error('You are not authorized to view this page');
  }
  const countries = fetch(
    'https://restcountries.com/v2/all?fields=name,alpha2Code,flags'
  ).then((res) => res.json());
  const registrations = db.registration.findMany({
    include: { user: true, group: true },
    orderBy: [{ group: { name: 'asc' } }, { user: { lastName: 'asc' } }],
  });
  const groups = db.group.findMany({
    orderBy: { name: 'asc' },
  });
  return Promise.all([registrations, countries, groups]);
};

export default function () {
  const [registrations, countries, groups] =
    useLoaderData<
      [(Registration & { user: User; group?: Group })[], any[], Group[]]
    >();
  // selected registrationStatus
  const [registrationStatus, setRegistrationStatus] = useState<string>('');
  // selected group
  const [group, setGroup] = useState<string>('');
  // selected paymentStatus
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  // filtered registrations
  const [filteredRegistrations, setFilteredRegistrations] =
    useState<(Registration & { user: User; group?: Group })[]>(registrations);

  useEffect(() => {
    setFilteredRegistrations(
      registrations.filter((registration) => {
        if (
          registrationStatus &&
          registration.registrationStatus !== registrationStatus
        ) {
          return false;
        }
        if (group && registration?.group?.id !== group) {
          return false;
        }
        return !(paymentStatus && registration.paymentStatus !== paymentStatus);
      })
    );
  }, [registrationStatus, group, paymentStatus, registrations]);
  const mapGender = (short: string) => {
    switch (short) {
      case 'm':
        return 'male';
      case 'f':
        return 'female';
      case 'd':
        return 'genderqueer';
      case 'n':
        return 'question-mark';
    }
  };
  const mapStatus = (short: string) => {
    switch (short) {
      case 'l':
        return 'Local Student';
      case 'i':
        return 'International degree student';
      case 'o':
        return 'Exchange Student (arrived in 2021)';
      case 'e':
        return 'Exchange Student (arrived in 2022)';
    }
  };
  const getCountry = (code: string) => {
    return countries.find((c) => c.alpha2Code === code);
  };
  return (
    <main>
      <section className="mb-2 p-4 text-white">
        <h1 className="mb-2 text-2xl font-bold">Registration Status Board</h1>
        <p className="mb-4">This is for sending mails and stuff</p>
        <div className="space-x-4 md:flex">
          <label
            className="relative block rounded-lg border-2 border-gray-200 p-3"
            htmlFor="status"
          >
            <select
              id="status"
              onChange={(event) => setRegistrationStatus(event.target.value)}
              className="peer w-full border-none bg-slate-800 px-0 pt-3.5 pb-0 text-sm placeholder-transparent focus:ring-0"
            >
              <option value="">All</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <span className="absolute left-3 -translate-y-1/3 text-xs font-medium text-gray-200 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-3 peer-focus:-translate-y-1/3 peer-focus:text-xs">
              Status
            </span>
          </label>
          <label
            className="relative block rounded-lg border-2 border-gray-200 p-3"
            htmlFor="group"
          >
            <select
              id="group"
              onChange={(event) => setGroup(event.target.value)}
              className="peer w-full border-none bg-slate-800 px-0 pt-3.5 pb-0 text-sm placeholder-transparent focus:ring-0"
            >
              <option value="">All</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <span className="absolute left-3 -translate-y-1/3 text-xs font-medium text-gray-200 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-3 peer-focus:-translate-y-1/3 peer-focus:text-xs">
              Group
            </span>
          </label>
          <label
            className="relative block rounded-lg border-2 border-gray-200 p-3"
            htmlFor="paymentStatus"
          >
            <select
              id="paymentStatus"
              onChange={(event) => setPaymentStatus(event.target.value)}
              className="peer w-full border-none bg-slate-800 px-0 pt-3.5 pb-0 text-sm placeholder-transparent focus:ring-0"
            >
              <option value="">All</option>
              <option value="PENDING">pending</option>
              <option value="SUCCESS">paid</option>
            </select>
            <span className="absolute left-3 -translate-y-1/3 text-xs font-medium text-gray-200 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-3 peer-focus:-translate-y-1/3 peer-focus:text-xs">
              Payment Status
            </span>
          </label>
        </div>
      </section>
      <section className="mb-2 p-4 text-white">
        <h2 className="mb-4 text-lg font-bold">
          Selected registrations ({filteredRegistrations.length})
        </h2>
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Group</th>
              <th className="px-4 py-2">Registration Status</th>
              <th className="px-4 py-2">Payment status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegistrations.map((registration) => (
              <tr key={registration.id}>
                <td className="px-4 py-2">
                  {registration.user.firstName} {registration.user.lastName}
                </td>
                <td className="px-4 py-2">{registration.user.email}</td>
                <td className="px-4 py-2">{registration.group?.name}</td>
                <td className="px-4 py-2">{registration.registrationStatus}</td>
                <td className="px-4 py-2">{registration.paymentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="mb-2 p-4 text-white">
        <h2 className="mb-4 text-lg font-bold">
          All those mails ({filteredRegistrations.length})
        </h2>
        <pre className="select-all whitespace-pre-wrap break-words">
          {filteredRegistrations.map((r) => r.user.email).join(';')}
        </pre>
      </section>
    </main>
  );
}
