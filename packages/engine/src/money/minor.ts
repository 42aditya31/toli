/**
 * A money amount in minor units (paise, cents, whole yen), branded so a plain number can never be
 * passed where money is expected (07 §13 #9). Engine functions accept any bigint; storage and UI
 * layers use Minor so the type system shows where money flows.
 */
export type Minor = bigint & { readonly __minor: unique symbol };
