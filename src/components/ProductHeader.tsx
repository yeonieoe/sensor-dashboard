import { useEffect } from 'react'
import { isDemoMode } from '../lib/supabase'
import { PRODUCT } from '../product'

const slots = {
  name: '[제품 이름]',
  concept: '[제품 컨셉, 한 줄]',
  description: '[제품 설명, 2~3문장]',
}

export default function ProductHeader() {
  useEffect(() => {
    document.title = PRODUCT.name || slots.name
  }, [])

  return (
    <header className="product-header">
      <p className={`t-display ${PRODUCT.name ? '' : 'placeholder'}`}>
        {PRODUCT.name || slots.name}
      </p>
      <p className={`t-label product-concept ${PRODUCT.concept ? '' : 'placeholder'}`}>
        {PRODUCT.concept || slots.concept}
      </p>
      <p
        className={`t-body product-description ${
          PRODUCT.description ? '' : 'placeholder'
        }`}
      >
        {PRODUCT.description || slots.description}
      </p>
      {isDemoMode ? <p className="t-caption demo-label">데모 데이터로 표시 중</p> : null}
    </header>
  )
}
