"use client";

import Link from "next/link";

import { AccountShell } from "@/components/account-shell";
import { EntityLibraryActions } from "@/components/entity-library-actions";
import { HotelStars } from "@/components/hotel-stars";
import { MediaTile } from "@/components/media-tile";
import {
  type LibraryHotel,
  type LibraryNotablePerson,
  useUserLibrary,
} from "@/components/user-library-provider";
import { useAuth } from "@/components/auth-provider";
import { categoryLabel, formatFollowerCount } from "@/lib/labels";

export default function AccountLibraryPage() {
  const { user, loading: authLoading, openAuth } = useAuth();

  if (authLoading) {
    return (
      <main className="section container account-page">
        <p>در حال بارگذاری پسندیده‌ها و ذخیره‌ها…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="section container account-page">
        <section className="account-guest-card">
          <span className="section-eyebrow">کتابخانه من</span>
          <h1>برای دیدن پسندیده‌ها و ذخیره‌ها وارد شوید</h1>
          <p>هتل‌ها و چهره‌هایی که می‌پسندید یا ذخیره می‌کنید اینجا می‌مانند.</p>
          <button className="button" type="button" onClick={openAuth}>
            ورود یا عضویت
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="section container account-page account-library-page">
      <AccountShell active="library">
        <AccountLibraryContent />
      </AccountShell>
    </main>
  );
}

function AccountLibraryContent() {
  const { data, loading, error } = useUserLibrary();
  const likedCount = data.likedHotels.length + data.likedNotablePeople.length;
  const savedCount = data.savedHotels.length + data.savedNotablePeople.length;

  return (
    <section className="account-library-content">
      <div className="account-page-heading">
        <span className="section-eyebrow">کتابخانه من</span>
        <h1>پسندیده‌ها و ذخیره‌ها</h1>
        <p>هتل‌ها و چهره‌های موردعلاقه‌تان را در دو فهرست مستقل نگه دارید.</p>
      </div>

      {error ? (
        <p className="form-feedback form-feedback-error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="account-activity-loading">در حال دریافت…</p> : null}

      {!loading ? (
        <div className="account-library-groups">
          <LibraryGroup title="ذخیره‌شده‌ها" count={savedCount}>
            {data.savedHotels.map((hotel) => (
              <HotelLibraryCard hotel={hotel} key={`saved-hotel-${hotel.slug}`} />
            ))}
            {data.savedNotablePeople.map((person) => (
              <PersonLibraryCard
                person={person}
                key={`saved-person-${person.slug}`}
              />
            ))}
          </LibraryGroup>
          <LibraryGroup title="پسندیده‌ها" count={likedCount}>
            {data.likedHotels.map((hotel) => (
              <HotelLibraryCard hotel={hotel} key={`liked-hotel-${hotel.slug}`} />
            ))}
            {data.likedNotablePeople.map((person) => (
              <PersonLibraryCard
                person={person}
                key={`liked-person-${person.slug}`}
              />
            ))}
          </LibraryGroup>
        </div>
      ) : null}
    </section>
  );
}

function LibraryGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="account-library-group">
      <div className="account-library-group-heading">
        <h2>{title}</h2>
        <span>{count.toLocaleString("fa-IR")}</span>
      </div>
      {count ? (
        <div className="account-library-grid">{children}</div>
      ) : (
        <p className="account-activity-empty">هنوز موردی در این فهرست نیست.</p>
      )}
    </section>
  );
}

function HotelLibraryCard({ hotel }: { hotel: LibraryHotel }) {
  return (
    <article className="account-library-item">
      <Link href={`/hotels/${hotel.slug}`}>
        <div className="account-library-media">
          <MediaTile imageUrl={hotel.imageUrl} label={hotel.name} variant="hotel" />
        </div>
        <div>
          <small>هتل · {hotel.city}</small>
          <h3>{hotel.name}</h3>
          <HotelStars value={hotel.starRating} />
        </div>
      </Link>
      <EntityLibraryActions entity="hotel" slug={hotel.slug} label={hotel.name} />
    </article>
  );
}

function PersonLibraryCard({ person }: { person: LibraryNotablePerson }) {
  const followerCount = formatFollowerCount(person.followerCount);
  return (
    <article className="account-library-item">
      <Link href={`/notable-people/${person.slug}`}>
        <div className="account-library-media account-library-media-person">
          <MediaTile
            imageUrl={person.imageUrl}
            label={person.displayName}
            variant="person"
          />
        </div>
        <div>
          <small>چهره · {categoryLabel(person.primaryCategory)}</small>
          <h3>{person.displayName}</h3>
          <p>
            {[person.occupation, followerCount ? `${followerCount} دنبال‌کننده` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </Link>
      <EntityLibraryActions
        entity="notable-person"
        slug={person.slug}
        label={person.displayName}
      />
    </article>
  );
}
