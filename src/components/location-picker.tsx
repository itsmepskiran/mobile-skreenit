import { useQuery } from '@tanstack/react-query';

import { SelectField } from '@/components/select-field';
import { ThemedView } from '@/components/themed-view';
import { apiGet } from '@/lib/api/client';

interface CountryOption {
  id: number;
  name: string;
}
interface StateOption {
  id: number;
  name: string;
  country_id: number;
}
interface CityOption {
  id: number;
  name: string;
  state_id: number;
  country_id: number;
}

export interface LocationValue {
  countryId?: string;
  countryName?: string;
  stateId?: string;
  stateName?: string;
  cityId?: string;
  cityName?: string;
}

export interface LocationPickerProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}

// Cascading Country -> State -> City using GET /locations/{countries,states,cities}.
// Each tier is a SelectField; changing a tier clears the ones below it.
export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const countriesQuery = useQuery({
    queryKey: ['locations', 'countries'],
    queryFn: () => apiGet<CountryOption[]>('/locations/countries', { auth: false }),
    staleTime: 1000 * 60 * 60,
  });

  const statesQuery = useQuery({
    queryKey: ['locations', 'states', value.countryId],
    queryFn: () => apiGet<StateOption[]>(`/locations/states?country_id=${value.countryId}`, { auth: false }),
    enabled: !!value.countryId,
    staleTime: 1000 * 60 * 60,
  });

  const citiesQuery = useQuery({
    queryKey: ['locations', 'cities', value.stateId],
    queryFn: () => apiGet<CityOption[]>(`/locations/cities?state_id=${value.stateId}&limit=200`, { auth: false }),
    enabled: !!value.stateId,
    staleTime: 1000 * 60 * 60,
  });

  const countryOptions = (countriesQuery.data ?? []).map((c) => ({ label: c.name, value: String(c.id) }));
  const stateOptions = (statesQuery.data ?? []).map((s) => ({ label: s.name, value: String(s.id) }));
  const cityOptions = (citiesQuery.data ?? []).map((c) => ({ label: c.name, value: String(c.id) }));

  return (
    <ThemedView style={{ gap: 12 }}>
      <SelectField
        label="Country"
        icon="earth-americas"
        searchable
        value={value.countryId}
        options={countryOptions}
        placeholder="Select country"
        onChange={(id) => {
          const name = countryOptions.find((o) => o.value === id)?.label;
          onChange({ countryId: id, countryName: name });
        }}
      />
      <SelectField
        label="State"
        icon="map"
        searchable
        disabled={!value.countryId}
        value={value.stateId}
        options={stateOptions}
        placeholder={value.countryId ? 'Select state' : 'Select a country first'}
        onChange={(id) => {
          const name = stateOptions.find((o) => o.value === id)?.label;
          onChange({ ...value, stateId: id, stateName: name, cityId: undefined, cityName: undefined });
        }}
      />
      <SelectField
        label="City"
        icon="location-dot"
        searchable
        disabled={!value.stateId}
        value={value.cityId}
        options={cityOptions}
        placeholder={value.stateId ? 'Select city' : 'Select a state first'}
        onChange={(id) => {
          const name = cityOptions.find((o) => o.value === id)?.label;
          onChange({ ...value, cityId: id, cityName: name });
        }}
      />
    </ThemedView>
  );
}
