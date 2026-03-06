import { createHash } from 'crypto';

export function buildLineKey(input: {
    productId: string;
    options: Array<{ option_id: string; choice_id: string }>;
    toppings: Array<{ topping_id: string; quantity: number }>;
}) {
    const options = [...(input.options ?? [])]
        .map((x) => `${x.option_id}:${x.choice_id}`)
        .sort()
        .join('|');

    const toppings = [...(input.toppings ?? [])]
        .map((x) => `${x.topping_id}:${Number(x.quantity || 0)}`)
        .sort()
        .join('|');

    const raw = `${input.productId}__opt:${options}__top:${toppings}`;
    return createHash('sha1').update(raw).digest('hex');
}